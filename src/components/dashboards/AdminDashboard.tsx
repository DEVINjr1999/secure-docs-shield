import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Shield, 
  Activity, 
  AlertTriangle, 
  Settings, 
  FileText,
  BarChart3,
  Database,
  Lock,
  Eye,
  Search,
  Filter,
  Edit,
  RotateCcw,
  Plus,
  Calendar,
  User,
  CheckCircle,
  Link as LinkIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Document {
  id: string;
  title: string;
  document_type: string;
  jurisdiction: string;
  status: string;
  created_at: string;
  user_id: string;
  assigned_reviewer_id: string | null;
  owner_name?: string;
  reviewer_name?: string;
}

interface Reviewer {
  user_id: string;
  full_name: string;
  active_assignments: number;
}

interface Template {
  id: string;
  name: string;
  description: string;
  document_type: string;
  jurisdiction: string;
  is_active: boolean;
  template_schema: any;
  created_at: string;
}

interface AuditLog {
  id: string;
  user_id: string;
  event: string;
  action_type: string;
  created_at: string;
  document_id: string | null;
  metadata: any;
  user_name?: string;
}

export function AdminDashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, activeSessions: 0, securityAlerts: 0, totalDocuments: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [jurisdictionFilter, setJurisdictionFilter] = useState('all');
  const [reviewerFilter, setReviewerFilter] = useState('all');
  const [auditFilter, setAuditFilter] = useState('all');
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchDocuments(),
        fetchReviewers(),
        fetchTemplates(),
        fetchAuditLogs(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      return;
    }

    // Fetch user names separately
    const documentsWithNames = await Promise.all(
      (data || []).map(async (doc) => {
        const [ownerResult, reviewerResult] = await Promise.all([
          supabase.from('profiles').select('full_name').eq('user_id', doc.user_id).single(),
          doc.assigned_reviewer_id 
            ? supabase.from('profiles').select('full_name').eq('user_id', doc.assigned_reviewer_id).single()
            : Promise.resolve({ data: null })
        ]);

        return {
          ...doc,
          owner_name: ownerResult.data?.full_name || 'Unknown',
          reviewer_name: reviewerResult.data?.full_name || 'Unassigned'
        };
      })
    );

    setDocuments(documentsWithNames);
  };

  const fetchReviewers = async () => {
    const { data: reviewerProfiles, error } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .eq('role', 'legal_reviewer')
      .eq('account_status', 'active');

    if (error) {
      console.error('Error fetching reviewers:', error);
      return;
    }

    const reviewersWithCounts = await Promise.all(
      (reviewerProfiles || []).map(async (reviewer) => {
        const { count } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_reviewer_id', reviewer.user_id)
          .in('status', ['under_review', 'requires_revision']);

        return {
          ...reviewer,
          active_assignments: count || 0
        };
      })
    );

    setReviewers(reviewersWithCounts);
  };

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
      return;
    }

    setTemplates(data || []);
  };

  const fetchAuditLogs = async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching audit logs:', error);
      return;
    }

    // Fetch user names separately
    const logsWithNames = await Promise.all(
      (data || []).map(async (log) => {
        if (!log.user_id) {
          return { ...log, user_name: 'System' };
        }

        const { data: userData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', log.user_id)
          .single();

        return {
          ...log,
          user_name: userData?.full_name || 'System'
        };
      })
    );

    setAuditLogs(logsWithNames);
  };

  const fetchStats = async () => {
    const [usersCount, sessionsCount, alertsCount, documentsCount] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('user_sessions').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action_type', 'security'),
      supabase.from('documents').select('*', { count: 'exact', head: true })
    ]);

    setStats({
      totalUsers: usersCount.count || 0,
      activeSessions: sessionsCount.count || 0,
      securityAlerts: alertsCount.count || 0,
      totalDocuments: documentsCount.count || 0
    });
  };

  const handleReassignDocument = async (documentId: string, newReviewerId: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ 
          assigned_reviewer_id: newReviewerId,
          status: 'under_review'
        })
        .eq('id', documentId);

      if (error) throw error;

      // Log the reassignment
      await supabase.rpc('log_audit_event', {
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_event: 'document_reassigned',
        p_action_type: 'document',
        p_document_id: documentId,
        p_metadata: { new_reviewer_id: newReviewerId, old_reviewer_id: selectedDocument }
      });

      toast({
        title: 'Success',
        description: 'Document reassigned successfully',
      });

      setReassignDialogOpen(false);
      fetchDocuments();
      fetchReviewers();
    } catch (error) {
      console.error('Error reassigning document:', error);
      toast({
        title: 'Error',
        description: 'Failed to reassign document',
        variant: 'destructive',
      });
    }
  };

  const handleAssignToMe = async (documentId: string) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
      if (!uid) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('documents')
        .update({ assigned_reviewer_id: uid, status: 'under_review' })
        .eq('id', documentId);
      if (error) throw error;

      await supabase.rpc('log_audit_event', {
        p_user_id: uid,
        p_event: 'document_self_assigned',
        p_action_type: 'document',
        p_document_id: documentId,
        p_metadata: { reviewer_id: uid }
      });

      toast({ title: 'Assigned', description: 'You are now the reviewer.' });
      fetchDocuments();
      fetchReviewers();
    } catch (error) {
      console.error('Error assigning to self:', error);
      toast({ title: 'Error', description: 'Failed to assign', variant: 'destructive' });
    }
  };

  const handleApproveDocument = async (documentId: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('documents')
        .update({ status: 'approved', approved_at: now, reviewed_at: now })
        .eq('id', documentId);
      if (error) throw error;

      const { data: authData } = await supabase.auth.getUser();
      await supabase.rpc('log_audit_event', {
        p_user_id: authData.user?.id,
        p_event: 'document_approved',
        p_action_type: 'document',
        p_document_id: documentId,
      });

      toast({ title: 'Approved', description: 'Document approved successfully.' });
      fetchDocuments();
    } catch (error) {
      console.error('Error approving document:', error);
      toast({ title: 'Error', description: 'Failed to approve', variant: 'destructive' });
    }
  };

  const handleTemplateToggle = async (templateId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('document_templates')
        .update({ is_active: isActive })
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Template ${isActive ? 'activated' : 'deactivated'} successfully`,
      });

      fetchTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive',
      });
    }
  };

  const handleSaveTemplate = async (templateData: any) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user?.id) throw new Error('User not authenticated');

      if (editingTemplate) {
        const { error } = await supabase
          .from('document_templates')
          .update({
            name: templateData.name,
            description: templateData.description,
            document_type: templateData.document_type as any,
            jurisdiction: templateData.jurisdiction as any,
            template_schema: templateData.template_schema,
            is_active: templateData.is_active
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Template updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('document_templates')
          .insert({
            name: templateData.name,
            description: templateData.description,
            document_type: templateData.document_type as any,
            jurisdiction: templateData.jurisdiction as any,
            template_schema: templateData.template_schema,
            is_active: templateData.is_active,
            created_by: user.data.user.id
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Template created successfully',
        });
      }

      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive',
      });
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.owner_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesType = typeFilter === 'all' || doc.document_type === typeFilter;
    const matchesJurisdiction = jurisdictionFilter === 'all' || doc.jurisdiction === jurisdictionFilter;
    const matchesReviewer = reviewerFilter === 'all' || doc.assigned_reviewer_id === reviewerFilter;

    return matchesSearch && matchesStatus && matchesType && matchesJurisdiction && matchesReviewer;
  });

  const filteredAuditLogs = auditLogs.filter(log => {
    return auditFilter === 'all' || log.action_type === auditFilter;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      submitted: "secondary",
      under_review: "default",
      requires_revision: "destructive",
      approved: "default",
      rejected: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status.replace('_', ' ')}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-primary" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-accent" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Active Sessions</p>
                <p className="text-2xl font-bold">{stats.activeSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Security Alerts</p>
                <p className="text-2xl font-bold">{stats.securityAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-4 w-4 text-secondary" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Documents</p>
                <p className="text-2xl font-bold">{stats.totalDocuments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="reviewers">Reviewers</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Document Overview
              </CardTitle>
              <CardDescription>
                Complete visibility over all documents in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="requires_revision">Requires Revision</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="agreement">Agreement</SelectItem>
                    <SelectItem value="legal_brief">Legal Brief</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="litigation">Litigation</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={reviewerFilter} onValueChange={setReviewerFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Reviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reviewers</SelectItem>
                    {reviewers.map(reviewer => (
                      <SelectItem key={reviewer.user_id} value={reviewer.user_id}>
                        {reviewer.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Documents Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Jurisdiction</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Reviewer</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.title}</TableCell>
                        <TableCell>{doc.document_type}</TableCell>
                        <TableCell>{doc.jurisdiction}</TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        <TableCell>{doc.owner_name}</TableCell>
                        <TableCell>{doc.reviewer_name}</TableCell>
                        <TableCell>{format(new Date(doc.created_at), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAssignToMe(doc.id)}
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApproveDocument(doc.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDocument(doc.id);
                                setReassignDialogOpen(true);
                              }}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Link to={`/app/documents/${doc.id}/view`}>
                              <Button variant="outline" size="sm">
                                <LinkIcon className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviewers Tab */}
        <TabsContent value="reviewers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Reviewer Load & Management
              </CardTitle>
              <CardDescription>
                Monitor reviewer workload and manage assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reviewer</TableHead>
                      <TableHead>Active Assignments</TableHead>
                      <TableHead>Load Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviewers.map((reviewer) => (
                      <TableRow key={reviewer.user_id}>
                        <TableCell className="font-medium">{reviewer.full_name}</TableCell>
                        <TableCell>{reviewer.active_assignments}</TableCell>
                        <TableCell>
                          <Badge variant={reviewer.active_assignments > 5 ? "destructive" : reviewer.active_assignments > 2 ? "default" : "secondary"}>
                            {reviewer.active_assignments > 5 ? "High" : reviewer.active_assignments > 2 ? "Medium" : "Low"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Template Management
                  </CardTitle>
                  <CardDescription>
                    Create and manage document templates
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  setEditingTemplate(null);
                  setTemplateDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Jurisdiction</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>{template.document_type}</TableCell>
                        <TableCell>{template.jurisdiction}</TableCell>
                        <TableCell>
                          <Switch
                            checked={template.is_active}
                            onCheckedChange={(checked) => handleTemplateToggle(template.id, checked)}
                          />
                        </TableCell>
                        <TableCell>{format(new Date(template.created_at), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingTemplate(template);
                              setTemplateDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Audit Trail
              </CardTitle>
              <CardDescription>
                Complete system activity and security audit log
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <Select value={auditFilter} onValueChange={setAuditFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="auth">Authentication</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action Type</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Document</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.event}</TableCell>
                        <TableCell>{log.user_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action_type}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}</TableCell>
                        <TableCell>
                          {log.document_id && (
                            <Link to={`/app/documents/${log.document_id}/view`}>
                              <Button variant="outline" size="sm">
                                <LinkIcon className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reassignment Dialog */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Document</DialogTitle>
            <DialogDescription>
              Choose a new reviewer for this document
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Reviewer</Label>
              <Select onValueChange={(value) => selectedDocument && handleReassignDocument(selectedDocument, value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose reviewer" />
                </SelectTrigger>
                <SelectContent>
                  {reviewers.map(reviewer => (
                    <SelectItem key={reviewer.user_id} value={reviewer.user_id}>
                      {reviewer.full_name} ({reviewer.active_assignments} assignments)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? 'Update template details' : 'Create a new document template'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const template = {
              name: formData.get('name') as string,
              description: formData.get('description') as string,
              document_type: formData.get('document_type') as string,
              jurisdiction: formData.get('jurisdiction') as string,
              template_schema: JSON.parse(formData.get('template_schema') as string || '{}'),
              is_active: true
            };
            handleSaveTemplate(template);
          }}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  defaultValue={editingTemplate?.name} 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  defaultValue={editingTemplate?.description} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="document_type">Document Type</Label>
                  <Select name="document_type" defaultValue={editingTemplate?.document_type}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
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
                </div>
                <div>
                  <Label htmlFor="jurisdiction">Jurisdiction</Label>
                  <Select name="jurisdiction" defaultValue={editingTemplate?.jurisdiction}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select jurisdiction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="federal">Federal</SelectItem>
                      <SelectItem value="state">State</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                      <SelectItem value="county">County</SelectItem>
                      <SelectItem value="international">International</SelectItem>
                      <SelectItem value="cross_border">Cross Border</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="template_schema">Template Schema (JSON)</Label>
                <Textarea 
                  id="template_schema" 
                  name="template_schema" 
                  defaultValue={JSON.stringify(editingTemplate?.template_schema || {}, null, 2)}
                  placeholder='{"fields": [{"name": "field1", "type": "text", "required": true}]}'
                  className="font-mono"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTemplate ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}