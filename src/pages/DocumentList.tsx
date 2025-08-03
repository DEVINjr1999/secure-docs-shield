import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Edit, 
  Eye, 
  Trash2,
  Download,
  Upload
} from 'lucide-react';

export default function DocumentList() {
  const navigate = useNavigate();
  const { user, isRole } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    loadDocuments();
  }, [user, statusFilter, typeFilter, searchTerm]);

  const loadDocuments = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('documents')
        .select(`
          *,
          reviewer_profile:profiles!documents_assigned_reviewer_id_fkey(full_name),
          document_comments(count)
        `)
        .order('created_at', { ascending: false });

      // Apply filters based on user role
      if (isRole('client')) {
        query = query.eq('user_id', user.id);
      } else if (isRole('legal_reviewer')) {
        query = query.or(`assigned_reviewer_id.eq.${user.id},user_id.eq.${user.id}`);
      }
      // Admins can see all documents (no additional filter)

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      // Apply client-side filters
      if (statusFilter !== 'all') {
        filteredData = filteredData.filter(doc => doc.status === statusFilter);
      }

      if (typeFilter !== 'all') {
        filteredData = filteredData.filter(doc => doc.document_type === typeFilter);
      }

      if (searchTerm) {
        filteredData = filteredData.filter(doc => 
          doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setDocuments(filteredData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive',
      });
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      });

      loadDocuments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive',
      });
      console.error('Error deleting document:', error);
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
    return new Date(dateString).toLocaleDateString();
  };

  const canEdit = (document: any) => {
    return isRole('admin') || 
           (document.user_id === user?.id && ['draft', 'requires_revision'].includes(document.status));
  };

  const canDelete = (document: any) => {
    return isRole('admin') || 
           (document.user_id === user?.id && document.status === 'draft');
  };

  return (
    <AppLayout title="Documents">
      <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Documents</h1>
            <p className="text-muted-foreground">
              Manage your legal documents securely
            </p>
          </div>
          
          {(isRole('client') || isRole('admin')) && (
            <Button onClick={() => navigate('/app/documents/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Document
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="requires_revision">Requires Revision</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="agreement">Agreement</SelectItem>
                  <SelectItem value="legal_notice">Legal Notice</SelectItem>
                  <SelectItem value="compliance_document">Compliance Document</SelectItem>
                  <SelectItem value="litigation_document">Litigation Document</SelectItem>
                  <SelectItem value="corporate_document">Corporate Document</SelectItem>
                  <SelectItem value="intellectual_property">Intellectual Property</SelectItem>
                  <SelectItem value="employment_document">Employment Document</SelectItem>
                  <SelectItem value="real_estate_document">Real Estate Document</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={loadDocuments}
              >
                <Search className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Documents List
          </CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `${documents.length} documents found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                {(isRole('legal_reviewer') || isRole('admin')) && (
                  <TableHead>Assigned Reviewer</TableHead>
                )}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((document) => (
                <TableRow key={document.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{document.title}</div>
                      {document.description && (
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {document.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline">
                      {document.document_type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant={getStatusVariant(document.status)}>
                      {document.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>{formatDate(document.created_at)}</TableCell>
                  
                  {(isRole('legal_reviewer') || isRole('admin')) && (
                    <TableCell>
                      {document.reviewer_profile?.full_name || 'Unassigned'}
                    </TableCell>
                  )}
                  
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/app/documents/${document.id}/view`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {canEdit(document) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/app/documents/${document.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {canDelete(document) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(document.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              
              {documents.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={isRole('admin') || isRole('legal_reviewer') ? 6 : 5} className="text-center py-8">
                    <div className="text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2" />
                      <p>No documents found</p>
                      {isRole('client') && (
                        <Button
                          variant="link"
                          onClick={() => navigate('/app/documents/new')}
                          className="mt-2"
                        >
                          Create your first document
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  );
}