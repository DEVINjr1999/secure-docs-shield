import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DocumentDecryption } from '@/components/DocumentDecryption';
import { 
  FileText, 
  ArrowLeft, 
  Download, 
  MessageSquare,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  EyeOff,
  Lock
} from 'lucide-react';

export default function ReviewerDocumentView() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { user, isRole } = useAuth();
  const { toast } = useToast();
  const [document, setDocument] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Check if user has legal_reviewer role
    if (user && !isRole('legal_reviewer')) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this document",
        variant: "destructive",
      });
      navigate('/reviewer/dashboard');
      return;
    }
    
    if (documentId) {
      loadDocument();
      loadComments();
    }
  }, [documentId, user, isRole, navigate]);

  const loadDocument = async () => {
    if (!documentId || !user) return;

    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          user:user_id(id),
          assigned_reviewer:assigned_reviewer_id(id),
          profiles!documents_user_id_fkey (
            full_name
          )
        `)
        .eq('id', documentId)
        .eq('assigned_reviewer_id', user.id) // Ensure only assigned reviewer can access
        .single();

      if (error) throw error;
      
      if (!data) {
        toast({
          title: "Access Denied",
          description: "This document is not assigned to you",
          variant: "destructive",
        });
        navigate('/reviewer/dashboard');
        return;
      }
      
      setDocument(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load document',
        variant: 'destructive',
      });
      navigate('/reviewer/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    if (!documentId) return;

    try {
      const { data, error } = await supabase
        .from('document_comments')
        .select(`
          *,
          profiles!document_comments_user_id_fkey (
            full_name
          )
        `)
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error('Error loading comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user || !documentId) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('document_comments')
        .insert({
          document_id: documentId,
          user_id: user.id,
          comment: newComment.trim(),
          is_internal: true, // Reviewer comments are always internal
        });

      if (error) throw error;

      setNewComment('');
      loadComments();
      
      // Log audit event
      await supabase.rpc('log_audit_event', {
        p_user_id: user.id,
        p_event: 'reviewer_comment_added',
        p_action_type: 'document',
        p_document_id: documentId,
        p_metadata: { comment_type: 'internal_review' }
      });
      
      toast({
        title: 'Success',
        description: 'Internal comment added successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!documentId || !user) return;

    try {
      const updateData: any = { 
        status: newStatus, 
        reviewed_at: new Date().toISOString() 
      };
      
      if (newStatus === 'approved') {
        updateData.approved_at = new Date().toISOString();
      } else if (newStatus === 'rejected') {
        updateData.rejected_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', documentId);

      if (error) throw error;

      // Log audit event
      await supabase.rpc('log_audit_event', {
        p_user_id: user.id,
        p_event: 'document_status_updated',
        p_action_type: 'document',
        p_document_id: documentId,
        p_old_values: { status: document.status },
        p_new_values: { status: newStatus },
        p_metadata: { review_action: newStatus, reviewer_id: user.id }
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
    }
  };

  const handleDecryptedContent = (content: string) => {
    setDecryptedContent(content);
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
          <Button onClick={() => navigate('/reviewer/dashboard')} className="mt-4">
            Back to Reviewer Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/reviewer/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Reviewer Dashboard
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{document.title}</h1>
            <p className="text-muted-foreground">{document.description}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Client: {document.profiles?.full_name || 'Unknown'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant={getStatusVariant(document.status)}>
              {document.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
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
              {document.encrypted_content && !decryptedContent ? (
                <DocumentDecryption
                  encryptedContent={document.encrypted_content}
                  onDecrypted={handleDecryptedContent}
                />
              ) : decryptedContent ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Decrypted Form Data</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDecryptedContent(null)}
                    >
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide Content
                    </Button>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm">{decryptedContent}</pre>
                  </div>
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
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
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

          {/* Internal Comments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Review Comments
              </CardTitle>
              <CardDescription>
                Internal comments visible to reviewers and admins only
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {comments.filter(comment => comment.is_internal).map((comment) => (
                  <div key={comment.id} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        <span className="font-medium">
                          {comment.profiles?.full_name || 'Reviewer'}
                          {comment.user_id === user?.id ? ' (You)' : ''}
                        </span>
                        <Badge variant="outline" className="ml-2">Internal</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm">{comment.comment}</p>
                  </div>
                ))}

                {comments.filter(comment => comment.is_internal).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No internal comments yet
                  </p>
                )}

                <Separator />

                <div className="space-y-4">
                  <Textarea
                    placeholder="Add an internal review comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[100px]"
                  />
                  
                  <Button 
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || submitting}
                  >
                    {submitting ? 'Adding...' : 'Add Internal Comment'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
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
          {document.status === 'under_review' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Review Actions
                </CardTitle>
                <CardDescription>
                  Update the document status after review
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
                  Requires Revision
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}