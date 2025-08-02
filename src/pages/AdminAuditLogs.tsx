import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, 
  Search, 
  Filter,
  Eye,
  Download,
  Calendar,
  User,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface AuditLog {
  id: string;
  user_id: string | null;
  event: string;
  action_type: string;
  document_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  old_values: any;
  new_values: any;
  metadata: any;
  success: boolean;
  error_details: string | null;
  risk_score: number | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
  } | null;
}

export default function AdminAuditLogs() {
  const { user, isRole } = useAuth();
  const { toast } = useToast();
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [actionTypeFilter, setActionTypeFilter] = useState('all');
  const [successFilter, setSuccessFilter] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState('7');

  useEffect(() => {
    if (!isRole('admin')) {
      toast({
        title: "Access Denied",
        description: "Admin privileges required to view audit logs",
        variant: "destructive",
      });
      return;
    }
    
    loadAuditLogs();
  }, [isRole, selectedDateRange]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(selectedDateRange));

      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          profiles!audit_logs_user_id_fkey (
            full_name
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      setLogs(data as unknown as AuditLog[] || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load audit logs",
        variant: "destructive",
      });
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = logs;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ip_address?.includes(searchTerm) ||
        JSON.stringify(log.metadata).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply event filter
    if (eventFilter !== 'all') {
      filtered = filtered.filter(log => log.event === eventFilter);
    }

    // Apply action type filter
    if (actionTypeFilter !== 'all') {
      filtered = filtered.filter(log => log.action_type === actionTypeFilter);
    }

    // Apply success filter
    if (successFilter !== 'all') {
      filtered = filtered.filter(log => log.success === (successFilter === 'success'));
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, eventFilter, actionTypeFilter, successFilter]);

  const getEventBadgeVariant = (event: string, success: boolean) => {
    if (!success) return 'destructive';
    
    switch (event) {
      case 'document_approved':
      case 'user_login':
        return 'default';
      case 'document_rejected':
      case 'user_logout':
        return 'secondary';
      case 'document_flagged':
      case 'security_alert':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getRiskBadge = (score: number | null) => {
    if (!score) return null;
    
    if (score >= 8) return <Badge variant="destructive">High Risk</Badge>;
    if (score >= 5) return <Badge variant="destructive">Medium Risk</Badge>;
    if (score >= 3) return <Badge variant="outline">Low Risk</Badge>;
    return null;
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Event', 'Action Type', 'Success', 'IP Address', 'Details'].join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.profiles?.full_name || 'System',
        log.event,
        log.action_type,
        log.success ? 'Success' : 'Failed',
        log.ip_address || '',
        log.error_details || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Audit logs exported successfully",
    });
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
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Shield className="h-8 w-8 mr-3" />
              Audit Logs
            </h1>
            <p className="text-muted-foreground">Security and activity monitoring</p>
          </div>
          <Button onClick={exportLogs} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{logs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Users Active</p>
                <p className="text-2xl font-bold">
                  {new Set(logs.map(l => l.user_id).filter(Boolean)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Failed Events</p>
                <p className="text-2xl font-bold">
                  {logs.filter(l => !l.success).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-yellow-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">High Risk</p>
                <p className="text-2xl font-bold">
                  {logs.filter(l => l.risk_score && l.risk_score >= 8).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>
            Comprehensive log of all system activities and security events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="space-y-4 mb-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search events, users, IP addresses, or metadata..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid gap-2 md:grid-cols-5">
              <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 24 hours</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>

              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="document_created">Document Created</SelectItem>
                  <SelectItem value="document_submitted">Document Submitted</SelectItem>
                  <SelectItem value="document_approved">Document Approved</SelectItem>
                  <SelectItem value="document_rejected">Document Rejected</SelectItem>
                  <SelectItem value="comment_added">Comment Added</SelectItem>
                  <SelectItem value="document_assigned">Document Assigned</SelectItem>
                  <SelectItem value="user_login">User Login</SelectItem>
                </SelectContent>
              </Select>

              <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Action Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="auth">Authentication</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="notification">Notification</SelectItem>
                </SelectContent>
              </Select>

              <Select value={successFilter} onValueChange={setSuccessFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={loadAuditLogs}>
                <Filter className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Audit Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No audit logs found for the selected criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className={!log.success ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          {log.profiles?.full_name || 'System'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getEventBadgeVariant(log.event, log.success)}>
                          {log.event.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.success ? 'default' : 'destructive'}>
                          {log.success ? 'Success' : 'Failed'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ip_address || '-'}
                      </TableCell>
                      <TableCell>
                        {getRiskBadge(log.risk_score)}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          {log.error_details && (
                            <p className="text-red-600 text-sm mb-1">{log.error_details}</p>
                          )}
                          {log.metadata && (
                            <details className="text-xs">
                              <summary className="cursor-pointer">View Metadata</summary>
                              <pre className="mt-1 p-2 bg-muted rounded text-xs">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}