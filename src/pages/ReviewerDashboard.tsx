import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ArrowLeft,
  Download,
  Flag,
  UserCheck,
  XCircle,
  RefreshCw,
  Settings
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
  version: number;
  parent_document_id: string | null;
  created_at: string;
  reviewed_at: string | null;
  metadata: any;
  file_name: string | null;
  file_size: number | null;
  file_mime_type: string | null;
  profiles?: {
    full_name: string | null;
  } | null;
}

interface Reviewer {
  user_id: string;
  full_name: string | null;
}

interface AuditLog {
  id: string;
  event: string;
  created_at: string;
  metadata: any;
}

interface ComplianceCheck {
  id: string;
  label: string;
  checked: boolean;
}

export default function ReviewerDashboard() {
  const navigate = useNavigate();
  const { user, isRole } = useAuth();
  const { toast } = useToast();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [jurisdictionFilter, setJurisdictionFilter] = useState('all');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [versionHistory, setVersionHistory] = useState<Document[]>([]);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [newReviewerId, setNewReviewerId] = useState('');
  const [comment, setComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [flags, setFlags] = useState<string[]>([]);
  const [complianceChecks, setComplianceChecks] = useState<ComplianceCheck[]>([
    { id: '1', label: 'Legal terminology accuracy verified', checked: false },
    { id: '2', label: 'Jurisdiction compliance checked', checked: false },
    { id: '3', label: 'Client requirements satisfied', checked: false },
    { id: '4', label: 'Document formatting appropriate', checked: false },
    { id: '5', label: 'No conflicts of interest identified', checked: false }
  ]);
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
          version,
          parent_document_id,
          created_at,
          reviewed_at,
          metadata,
          file_name,
          file_size,
          file_mime_type,
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
      
      // Load reviewers for reassignment
      await loadReviewers();
      
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

  const loadReviewers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('role', 'legal_reviewer')
        .eq('account_status', 'active');

      if (error) throw error;
      setReviewers(data || []);
    } catch (error: any) {
      console.error('Error loading reviewers:', error);
    }
  };

  const loadDocumentAudit = async (documentId: string) => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error: any) {
      console.error('Error loading audit logs:', error);
    }
  };

  const loadVersionHistory = async (documentId: string) => {
    try {
      // Get parent document ID if this is a revision
      const currentDoc = documents.find(d => d.id === documentId);
      const parentId = currentDoc?.parent_document_id || documentId;

      const { data, error } = await supabase
        .from('documents')
        .select(`
          id, title, version, status, created_at, submitted_at, 
          file_name, file_size, file_mime_type, document_type, 
          jurisdiction, user_id, parent_document_id, reviewed_at, metadata
        `)
        .or(`id.eq.${parentId},parent_document_id.eq.${parentId}`)
        .order('version', { ascending: false });

      if (error) throw error;
      setVersionHistory(data as Document[] || []);
    } catch (error: any) {
      console.error('Error loading version history:', error);
    }
  };

  useEffect(() => {
    let filtered = documents;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.document_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(doc.metadata).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.document_type === typeFilter);
    }

    // Apply jurisdiction filter
    if (jurisdictionFilter !== 'all') {
      filtered = filtered.filter(doc => doc.jurisdiction === jurisdictionFilter);
    }

    setFilteredDocuments(filtered);
  }, [documents, searchTerm, statusFilter, typeFilter, jurisdictionFilter]);

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

  const handleDocumentAction = async (documentId: string, action: 'approved' | 'rejected' | 'requires_revision') => {
    try {
      const updateData: any = { 
        status: action, 
        reviewed_at: new Date().toISOString() 
      };
      
      if (action === 'approved') {
        updateData.approved_at = new Date().toISOString();
      } else if (action === 'rejected') {
        updateData.rejected_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', documentId);

      if (error) throw error;

      // Add comment if provided
      if (comment) {
        await supabase
          .from('document_comments')
          .insert({
            document_id: documentId,
            user_id: user!.id,
            comment: comment,
            is_internal: isInternalComment,
          });
      }

      // Add flags if any
      if (flags.length > 0) {
        await supabase.rpc('log_audit_event', {
          p_user_id: user!.id,
          p_event: 'document_flagged',
          p_action_type: 'document',
          p_document_id: documentId,
          p_metadata: { flags }
        });
      }

      // Log audit event
      await supabase.rpc('log_audit_event', {
        p_user_id: user!.id,
        p_event: 'document_status_updated',
        p_action_type: 'document',
        p_document_id: documentId,
        p_metadata: { 
          new_status: action,
          compliance_checks: complianceChecks.map(c => ({ id: c.id, label: c.label, checked: c.checked })),
          flags
        }
      });

      toast({
        title: 'Success',
        description: `Document ${action.replace('_', ' ')} successfully`,
      });

      // Reset form
      setComment('');
      setFlags([]);
      setComplianceChecks(checks => checks.map(c => ({ ...c, checked: false })));
      
      // Reload documents
      loadAssignedDocuments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update document status',
        variant: 'destructive',
      });
    }
  };

  const handleReassignDocument = async () => {
    if (!selectedDocument || !newReviewerId) return;

    try {
      const { error } = await supabase
        .from('documents')
        .update({ assigned_reviewer_id: newReviewerId })
        .eq('id', selectedDocument.id);

      if (error) throw error;

      // Log reassignment
      await supabase.rpc('log_audit_event', {
        p_user_id: user!.id,
        p_event: 'document_reassigned',
        p_action_type: 'document',
        p_document_id: selectedDocument.id,
        p_metadata: { 
          old_reviewer: user!.id,
          new_reviewer: newReviewerId
        }
      });

      toast({
        title: 'Success',
        description: 'Document reassigned successfully',
      });

      setShowReassignDialog(false);
      setNewReviewerId('');
      loadAssignedDocuments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to reassign document',
        variant: 'destructive',
      });
    }
  };

  const downloadDocument = async (doc: Document) => {
    if (!doc.file_name) return;

    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_name);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Document downloaded successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Download Failed',
        description: 'Failed to download document',
        variant: 'destructive',
      });
    }
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
          <p className="text-muted-foreground">Advanced document review and management tools</p>
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Documents List */}
        <div className="lg:col-span-2">
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
              {/* Advanced Filters */}
              <div className="space-y-4 mb-6">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by title, type, client, or metadata..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid gap-2 md:grid-cols-3">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="requires_revision">Requires Revision</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Document Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="agreement">Agreement</SelectItem>
                      <SelectItem value="legal_notice">Legal Notice</SelectItem>
                      <SelectItem value="compliance_document">Compliance</SelectItem>
                      <SelectItem value="litigation_document">Litigation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={jurisdictionFilter} onValueChange={setJurisdictionFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Jurisdiction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Jurisdictions</SelectItem>
                      <SelectItem value="federal_australia">Federal Australia</SelectItem>
                      <SelectItem value="nsw">NSW</SelectItem>
                      <SelectItem value="vic">Victoria</SelectItem>
                      <SelectItem value="qld">Queensland</SelectItem>
                      <SelectItem value="wa">Western Australia</SelectItem>
                      <SelectItem value="international">International</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{doc.title}</h3>
                            {doc.version > 1 && (
                              <Badge variant="outline">v{doc.version}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedDocument(doc);
                                loadDocumentAudit(doc.id);
                                loadVersionHistory(doc.id);
                              }}
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Tools
                            </Button>
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
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Final Reviewer Tools Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Final Reviewer Tools
              </CardTitle>
              <CardDescription>
                Advanced review and management tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDocument ? (
                <Tabs defaultValue="actions" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="actions">Actions</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                    <TabsTrigger value="audit">Audit</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="actions" className="space-y-4">
                    {/* Compliance Checklist */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Compliance Checklist</Label>
                      {complianceChecks.map((check) => (
                        <div key={check.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={check.id}
                            checked={check.checked}
                            onCheckedChange={(checked) => 
                              setComplianceChecks(checks => 
                                checks.map(c => c.id === check.id ? { ...c, checked: !!checked } : c)
                              )
                            }
                          />
                          <Label htmlFor={check.id} className="text-xs">
                            {check.label}
                          </Label>
                        </div>
                      ))}
                    </div>

                    {/* Document Flags */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Document Flags</Label>
                      <div className="flex flex-wrap gap-2">
                        {['compliance concern', 'needs escalation', 'legal conflict', 'urgent review'].map((flag) => (
                          <Button
                            key={flag}
                            size="sm"
                            variant={flags.includes(flag) ? "default" : "outline"}
                            onClick={() => 
                              setFlags(prev => 
                                prev.includes(flag) 
                                  ? prev.filter(f => f !== flag)
                                  : [...prev, flag]
                              )
                            }
                          >
                            <Flag className="h-3 w-3 mr-1" />
                            {flag}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Comment Section */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Add Comment</Label>
                      <Textarea
                        placeholder="Enter your review comment..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="min-h-[80px]"
                      />
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="internal"
                          checked={isInternalComment}
                          onCheckedChange={setIsInternalComment}
                        />
                        <Label htmlFor="internal" className="text-xs">
                          Internal comment (not visible to client)
                        </Label>
                      </div>
                    </div>

                    {/* Review Actions */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Review Actions</Label>
                      <div className="space-y-2">
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => handleDocumentAction(selectedDocument.id, 'approved')}
                          disabled={!complianceChecks.every(c => c.checked)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve Document
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full"
                          onClick={() => handleDocumentAction(selectedDocument.id, 'rejected')}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject Document
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => handleDocumentAction(selectedDocument.id, 'requires_revision')}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Request Revision
                        </Button>
                      </div>
                    </div>

                    {/* Reassign Document */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Reassign Document</Label>
                      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="w-full">
                            <UserCheck className="h-4 w-4 mr-2" />
                            Reassign to Another Reviewer
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reassign Document</DialogTitle>
                            <DialogDescription>
                              Select a reviewer to reassign this document to.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Select value={newReviewerId} onValueChange={setNewReviewerId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select reviewer" />
                              </SelectTrigger>
                              <SelectContent>
                                {reviewers.filter(r => r.user_id !== user?.id).map((reviewer) => (
                                  <SelectItem key={reviewer.user_id} value={reviewer.user_id}>
                                    {reviewer.full_name || 'Unknown'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowReassignDialog(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleReassignDocument} disabled={!newReviewerId}>
                              Reassign
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Version History</Label>
                      {versionHistory.map((version) => (
                        <div key={version.id} className="border rounded p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Version {version.version}</span>
                            <Badge variant={getStatusVariant(version.status)}>
                              {formatStatus(version.status)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Created: {format(new Date(version.created_at), 'MMM d, yyyy HH:mm')}
                          </p>
                          {version.file_name && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs">{version.file_name}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => downloadDocument(version)}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="audit" className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Audit Timeline</Label>
                      {auditLogs.map((log) => (
                        <div key={log.id} className="border rounded p-3">
                          <p className="text-sm font-medium">{log.event.replace('_', ' ')}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                          </p>
                          {log.metadata && (
                            <pre className="text-xs mt-2 p-2 bg-muted rounded">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Select a document to access reviewer tools</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}