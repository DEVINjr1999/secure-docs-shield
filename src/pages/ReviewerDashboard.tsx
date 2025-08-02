import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  Search,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  title: string;
  document_type: string;
  jurisdiction: string | null;
  status: string;
  submitted_at: string;
  user_id: string;
  profiles?: {
    full_name: string | null;
  } | null;
}

export default function ReviewerDashboard() {
  const navigate = useNavigate();
  const { user, isRole } = useAuth();
  const { toast } = useToast();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    pending: 0,
    approvedToday: 0,
    urgent: 0,
    total: 0
  });

  useEffect(() => {
    // Check if user has legal_reviewer role
    if (user && !isRole('legal_reviewer')) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the reviewer dashboard",
        variant: "destructive",
      });
      navigate('/app');
      return;
    }
    
    if (user) {
      loadAssignedDocuments();
    }
  }, [user, isRole, navigate]);

  const loadAssignedDocuments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          document_type,
          jurisdiction,
          status,
          submitted_at,
          user_id,
          profiles!documents_user_id_fkey (
            full_name
          )
        `)
        .eq('assigned_reviewer_id', user.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      setDocuments(data as unknown as Document[] || []);
      
      // Calculate stats
      const today = new Date().toDateString();
      const stats = {
        pending: data?.filter(d => d.status === 'under_review').length || 0,
        approvedToday: data?.filter(d => 
          d.status === 'approved' && 
          new Date(d.submitted_at).toDateString() === today
        ).length || 0,
        urgent: data?.filter(d => d.status === 'requires_revision').length || 0,
        total: data?.length || 0
      };
      setStats(stats);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load assigned documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = documents;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.document_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }

    setFilteredDocuments(filtered);
  }, [documents, searchTerm, statusFilter]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'under_review':
        return 'default';
      case 'approved':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      case 'requires_revision':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/app')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        
        <div>
          <h1 className="text-3xl font-bold">Legal Reviewer Dashboard</h1>
          <p className="text-muted-foreground">Manage and review assigned documents</p>
        </div>
      </div>

      {/* Review Queue Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Approved Today</p>
                <p className="text-2xl font-bold">{stats.approvedToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Needs Revision</p>
                <p className="text-2xl font-bold">{stats.urgent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total Assigned</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Assigned Documents
          </CardTitle>
          <CardDescription>
            Documents assigned to you for review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters and Search */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search by title, type, or client name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="requires_revision">Requires Revision</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Documents List */}
          <div className="space-y-4">
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {documents.length === 0 
                  ? "No documents assigned to you yet"
                  : "No documents match your search criteria"
                }
              </div>
            ) : (
              filteredDocuments.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{doc.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>{doc.document_type}</span>
                        <span>•</span>
                        <span>{doc.jurisdiction}</span>
                        <span>•</span>
                        <span>Client: {doc.profiles?.full_name || 'Unknown'}</span>
                        <span>•</span>
                        <span>Submitted: {format(new Date(doc.submitted_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getStatusVariant(doc.status)}>
                        {formatStatus(doc.status)}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/reviewer/documents/${doc.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}