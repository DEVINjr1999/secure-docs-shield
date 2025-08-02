import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Edit
} from 'lucide-react';

export default function DocumentViewer() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { user, isRole } = useAuth();
  const [document, setDocument] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (documentId) {
      loadDocument();
      loadComments();
    }
  }, [documentId]);

  const loadDocument = async () => {
    if (!documentId) return;

    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          user:user_id(id),
          assigned_reviewer:assigned_reviewer_id(id)
        `)
        .eq('id', documentId)
        .single();

      if (error) throw error;
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
    if (!documentId) return;

    try {
      const { data, error } = await supabase
        .from('document_comments')
        .select(`
          *,
          user:user_id(id)
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
          is_internal: isRole(['admin', 'legal_reviewer']) && !isRole('client'),
        });

      if (error) throw error;

      setNewComment('');
      loadComments();
      
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
    if (!documentId || !user) return;

    try {
      const updateData: any = { status: newStatus };
      
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

      toast({
        title: 'Success',
        description: `Document ${newStatus} successfully`,
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

  const canEdit = () => {
    return user && document && (
      isRole('admin') || 
      (document.user_id === user.id && ['draft', 'requires_revision'].includes(document.status))
    );
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/app/documents')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{document.title}</h1>
            <p className="text-muted-foreground">{document.description}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant={getStatusVariant(document.status)}>
              {document.status.replace('_', ' ').toUpperCase()}
            </Badge>
            
            {canEdit() && (
              <Button
                onClick={() => navigate(`/app/documents/${documentId}/edit`)}
                variant="outline"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
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
              </CardTitle>
            </CardHeader>
            <CardContent>
              {document.file_name ? (
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
                  <p>No file content available</p>
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
                          User {comment.user_id === user?.id ? '(You)' : ''}
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
    </div>
  );
}