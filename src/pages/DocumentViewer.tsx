import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DocumentDecryption } from '@/components/DocumentDecryption';
import { DocumentTemplateRenderer } from '@/components/DocumentTemplateRenderer';
import { AdminPasswordDialog } from '@/components/AdminPasswordDialog';
import DocumentActivityFeed from '@/components/DocumentActivityFeed';
import DocumentTipsPanel from '@/components/DocumentTipsPanel';
import { 
  FileText, 
  ArrowLeft, 
  Download, 
  MessageSquare,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Eye,
  EyeOff,
  Lock,
  Shield
} from 'lucide-react';

export default function DocumentViewer() {
  const { documentId, id } = useParams();
  const docId = documentId || id; // Support both route patterns
  const navigate = useNavigate();
  const { user, isRole } = useAuth();
  const { toast } = useToast();
  const [document, setDocument] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [versionHistory, setVersionHistory] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showAdminPasswordDialog, setShowAdminPasswordDialog] = useState(false);
  const [adminAccessGranted, setAdminAccessGranted] = useState(false);

  useEffect(() => {
    if (docId) {
      loadDocument();
      loadComments();
      loadVersionHistory();
    }
  }, [docId]);

  const loadDocument = async () => {
    if (!docId) return;

    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          user_profile:profiles!documents_user_id_fkey(full_name, role),
          reviewer_profile:profiles!documents_assigned_reviewer_id_fkey(full_name, role)
        `)
        .eq('id', docId)
        .single();

      if (error) throw error;
      
      // Check access permissions
      if (!canAccessDocument(data)) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to view this document',
          variant: 'destructive',
        });
        navigate('/app/documents');
        return;
      }
      
      setDocument(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load document',
        variant: 'destructive',
      });
      console.error('Error loading document:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    if (!docId) return;

    try {
      // Filter comments based on user role
      let query = supabase
        .from('document_comments')
        .select(`
          *,
          user_profile:profiles!document_comments_user_id_fkey(full_name, role)
        `)
        .eq('document_id', docId);

      // If user is client (not admin or reviewer), only show non-internal comments
      if (!isRole(['admin', 'legal_reviewer'])) {
        query = query.eq('is_internal', false);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error('Error loading comments:', error);
    }
  };

  const loadVersionHistory = async () => {
    if (!docId) return;

    try {
      // Get all versions (documents with same parent or this document as parent)
      const { data, error } = await supabase
        .from('documents')
        .select('id, version, title, status, created_at, submitted_at')
        .or(`id.eq.${docId},parent_document_id.eq.${docId}`)
        .order('version', { ascending: false });

      if (error) throw error;
      setVersionHistory(data || []);
    } catch (error: any) {
      console.error('Error loading version history:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user || !docId) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('document_comments')
        .insert({
          document_id: docId,
          user_id: user.id,
          comment: newComment.trim(),
          is_internal: isInternalComment,
        });

      if (error) throw error;

      setNewComment('');
      setIsInternalComment(false);
      loadComments();
      
      // Log audit event
      await supabase.rpc('log_audit_event', {
        p_user_id: user.id,
        p_event: 'comment_added',
        p_action_type: 'document',
        p_document_id: docId,
        p_metadata: { comment_type: isInternalComment ? 'internal' : 'public' }
      });
      
      toast({
        title: 'Success',
        description: 'Comment added successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      });
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!docId || !user) return;

    try {
      const updateData: any = { status: newStatus, reviewed_at: new Date().toISOString() };
      
      if (newStatus === 'approved') {
        updateData.approved_at = new Date().toISOString();
      } else if (newStatus === 'rejected') {
        updateData.rejected_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', docId);

      if (error) throw error;

      // Log audit event
      await supabase.rpc('log_audit_event', {
        p_user_id: user.id,
        p_event: 'document_status_updated',
        p_action_type: 'document',
        p_document_id: docId,
        p_old_values: { status: document.status },
        p_new_values: { status: newStatus },
        p_metadata: { review_action: newStatus }
      });

      toast({
        title: 'Success',
        description: `Document ${newStatus.replace('_', ' ')} successfully`,
      });

      loadDocument();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update document status',
        variant: 'destructive',
      });
      console.error('Error updating status:', error);
    }
  };

  const handleDecryptedContent = (content: string) => {
    setDecryptedContent(content);
  };

  const isTemplateDocument = () => {
    try {
      if (decryptedContent) {
        const parsed = JSON.parse(decryptedContent);
        // Check for template structure or common form field patterns
        return parsed.templateId || 
               parsed.formData || 
               (typeof parsed === 'object' && parsed !== null && 
                Object.keys(parsed).some(key => 
                  key.includes('name') || 
                  key.includes('email') || 
                  key.includes('company') || 
                  key.includes('amount') ||
                  key.includes('date')
                ));
      }
      return false;
    } catch {
      return false;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'submitted': return 'default';
      case 'under_review': return 'default';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'requires_revision': return 'destructive';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canReview = () => {
    return user && document && (
      isRole('admin') || 
      (isRole('legal_reviewer') && document.assigned_reviewer_id === user.id)
    );
  };

  const canAccessDocument = (doc: any) => {
    if (!user || !doc) return false;
    return (
      isRole('admin') || // Admins can view all
      doc.user_id === user.id || // Document owner
      doc.assigned_reviewer_id === user.id // Assigned reviewer
    );
  };

  const canEdit = () => {
    return user && document && (
      isRole('admin') || 
      (document.user_id === user.id && ['draft', 'requires_revision'].includes(document.status))
    );
  };

  const handleSecureDownload = async () => {
    if (!document?.file_path || !user) return;

    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (error) throw error;

      // Create download URL
      const url = URL.createObjectURL(data);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.file_name || 'document';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Document downloaded successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Download Failed',
        description: 'Failed to download document. Please try again.',
        variant: 'destructive',
      });
      console.error('Download error:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleAdminAccess = () => {
    setAdminAccessGranted(true);
    toast({
      title: 'Admin Access Granted',
      description: 'You can now view this document without decryption',
    });
  };

  const canUseAdminAccess = () => {
    return user && isRole(['admin', 'legal_reviewer']) && document?.encrypted_content;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Document Not Found</h1>
          <Button onClick={() => navigate('/app/documents')} className="mt-4">
            Back to Documents
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout title={document?.title} showBackButton>
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">{document.title}</h1>
            <p className="text-muted-foreground text-sm sm:text-base">{document.description}</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getStatusVariant(document.status)}>
              {document.status.replace('_', ' ').toUpperCase()}
            </Badge>
            
            {canEdit() && (
              <Button
                onClick={() => navigate(`/app/documents/${docId}/edit`)}
                variant="outline"
                size="sm"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            
            {['rejected', 'requires_revision'].includes(document.status) && document.user_id === user?.id && (
              <Button
                onClick={() => navigate(`/app/documents/${docId}/edit`)}
                variant="default"
                size="sm"
              >
                <Edit className="h-4 w-4 mr-2" />
                Submit New Version
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
        <div className="lg:col-span-2 xl:col-span-3 space-y-4 sm:space-y-6">
          {/* Document Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Document Content
                {document.encrypted_content && (
                  <Lock className="h-4 w-4 ml-2 text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {document.encrypted_content && !decryptedContent && !adminAccessGranted ? (
                <div className="space-y-4">
                  <DocumentDecryption
                    encryptedContent={document.encrypted_content}
                    onDecrypted={handleDecryptedContent}
                  />
                  
                  {/* Admin/Reviewer Access Option */}
                  {canUseAdminAccess() && (
                    <div className="mt-4 p-4 border-t">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Admin/Reviewer Access
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAdminPasswordDialog(true)}
                        >
                          Access without Decryption
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Use admin/reviewer password to view document content directly
                      </p>
                    </div>
                  )}
                </div>
              ) : (decryptedContent || adminAccessGranted) ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">
                      {isTemplateDocument() ? 'Document Content' : 'Decrypted Form Data'}
                    </h3>
                    <div className="flex gap-2">
                      {adminAccessGranted && (
                        <Badge variant="secondary" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin Access
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDecryptedContent(null);
                          setAdminAccessGranted(false);
                        }}
                      >
                        <EyeOff className="h-4 w-4 mr-2" />
                        Hide Content
                      </Button>
                    </div>
                  </div>
                  
                  {adminAccessGranted ? (
                    <div className="space-y-4">
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                          <Shield className="h-4 w-4" />
                          <span className="font-medium">Admin/Reviewer Access Mode</span>
                        </div>
                        <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                          Document content is displayed using privileged access. Content remains encrypted in storage.
                        </p>
                      </div>
                      
                      {document.encrypted_content && (
                        <div className="bg-muted p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-2">Raw encrypted content (admin view):</p>
                          <pre className="whitespace-pre-wrap text-xs font-mono bg-background p-3 rounded border max-h-96 overflow-auto">
                            {document.encrypted_content.substring(0, 500)}...
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : decryptedContent ? (
                    <DocumentTemplateRenderer
                      templateData={decryptedContent}
                      documentTitle={document.title}
                      documentId={document.id}
                      createdAt={document.created_at}
                      status={document.status}
                    />
                  ) : (
                    <div className="bg-muted p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm">{decryptedContent}</pre>
                    </div>
                  )}
                </div>
              ) : document.file_name ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8 mr-3 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{document.file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {document.file_size ? `${(document.file_size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleSecureDownload}
                      disabled={downloading}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {downloading ? 'Downloading...' : 'Download'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Note: Document content is encrypted for security. Download to view the full content.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4" />
                  <p>No content available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Comments & Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="border-l-4 border-muted pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        <span className="font-medium">
                          {comment.user_profile?.full_name || 'Unknown User'} {comment.user_id === user?.id ? '(You)' : ''}
                        </span>
                        {comment.is_internal && (
                          <Badge variant="outline" className="ml-2">Internal</Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm">{comment.comment}</p>
                  </div>
                ))}

                {comments.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No comments yet
                  </p>
                )}

                <Separator />

                <div className="space-y-4">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[100px]"
                  />
                  
                  {isRole(['admin', 'legal_reviewer']) && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="internal-comment"
                        checked={isInternalComment}
                        onCheckedChange={setIsInternalComment}
                      />
                      <Label htmlFor="internal-comment" className="text-sm">
                        Internal comment (only visible to reviewers and admins)
                      </Label>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || submitting}
                  >
                    {submitting ? 'Adding...' : 'Add Comment'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="hidden lg:block space-y-4 sm:space-y-6">
          {/* Document Details */}
          <Card>
            <CardHeader>
              <CardTitle>Document Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <p className="text-sm text-muted-foreground">
                  {document.document_type.replace('_', ' ')}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Jurisdiction</label>
                <p className="text-sm text-muted-foreground">
                  {document.jurisdiction?.replace('_', ' ') || 'Not specified'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Created</label>
                <p className="text-sm text-muted-foreground">
                  {formatDate(document.created_at)}
                </p>
              </div>
              
              {document.submitted_at && (
                <div>
                  <label className="text-sm font-medium">Submitted</label>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(document.submitted_at)}
                  </p>
                </div>
              )}
              
              {document.reviewed_at && (
                <div>
                  <label className="text-sm font-medium">Reviewed</label>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(document.reviewed_at)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review Actions */}
          {canReview() && document.status === 'under_review' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Review Actions
                </CardTitle>
                <CardDescription>
                  Review and update the document status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() => handleStatusUpdate('approved')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Document
                </Button>
                
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => handleStatusUpdate('rejected')}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Document
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleStatusUpdate('requires_revision')}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Request Revision
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Version History */}
          {versionHistory.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Version History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {versionHistory.map((version) => (
                    <div 
                      key={version.id} 
                      className={`flex items-center justify-between p-3 border rounded-lg ${
                        version.id === docId ? 'bg-primary/5 border-primary' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">Version {version.version}</p>
                          {version.id === docId && (
                            <Badge variant="secondary" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(version.created_at)}
                        </p>
                        {version.submitted_at && (
                          <p className="text-xs text-muted-foreground">
                            Submitted: {formatDate(version.submitted_at)}
                          </p>
                        )}
                        <Badge variant={getStatusVariant(version.status)} className="mt-1">
                          {version.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        {version.id !== docId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/app/documents/${version.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        )}
                        {version.status === 'approved' && (
                          <Badge variant="default" className="text-xs">
                            Approved
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <div className="flex-1">
                    <p>Created</p>
                    <p className="text-muted-foreground">{formatDate(document.created_at)}</p>
                  </div>
                </div>
                
                {document.submitted_at && (
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                    <div className="flex-1">
                      <p>Submitted</p>
                      <p className="text-muted-foreground">{formatDate(document.submitted_at)}</p>
                    </div>
                  </div>
                )}
                
                {document.reviewed_at && (
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <div className="flex-1">
                      <p>Reviewed</p>
                      <p className="text-muted-foreground">{formatDate(document.reviewed_at)}</p>
                    </div>
                  </div>
                )}
                
                {document.approved_at && (
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                    <div className="flex-1">
                      <p>Approved</p>
                      <p className="text-muted-foreground">{formatDate(document.approved_at)}</p>
                    </div>
                  </div>
                )}
                
                {document.rejected_at && (
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                    <div className="flex-1">
                      <p>Rejected</p>
                      <p className="text-muted-foreground">{formatDate(document.rejected_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Mobile-only bottom panels */}
      <div className="lg:hidden mt-6 space-y-4">
        <DocumentActivityFeed documentId={docId!} />
        <DocumentTipsPanel documentType={document.document_type} />
      </div>
      
      {/* Admin Password Dialog */}
      <AdminPasswordDialog
        open={showAdminPasswordDialog}
        onOpenChange={setShowAdminPasswordDialog}
        onSuccess={handleAdminAccess}
      />
      </div>
    </AppLayout>
  );
}