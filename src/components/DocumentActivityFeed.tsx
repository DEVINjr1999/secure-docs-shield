import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  User, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare,
  Upload,
  Eye,
  Edit,
  Shield
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ActivityItem {
  id: string;
  event: string;
  action_type: string;
  created_at: string;
  user_id: string;
  metadata: any;
  success: boolean;
  // Profile data will be joined
  profile?: {
    full_name: string;
    avatar_url: string;
    role: string;
  };
}

interface DocumentActivityFeedProps {
  documentId: string;
  className?: string;
}

export default function DocumentActivityFeed({ documentId, className }: DocumentActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [documentId]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      
      // Get audit logs for this document with profile information
      const { data: auditData, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          event,
          action_type,
          created_at,
          user_id,
          metadata,
          success
        `)
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique user IDs from audit logs
      const userIds = [...new Set(auditData?.map(item => item.user_id).filter(Boolean))];

      // Fetch profile data for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
      }

      // Create a map of user profiles
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.user_id, profile);
      });

      // Transform the data to include profile info
      const transformedData = auditData?.map(item => ({
        ...item,
        profile: profilesMap.get(item.user_id) || null
      })) || [];

      setActivities(transformedData);
    } catch (error) {
      console.error('Error loading activities:', error);
      toast({
        title: "Error",
        description: "Failed to load document activity feed.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (event: string, success: boolean) => {
    if (!success) return <XCircle className="h-4 w-4 text-destructive" />;
    
    switch (event) {
      case 'document_created':
      case 'document_uploaded':
        return <Upload className="h-4 w-4 text-blue-500" />;
      case 'document_submitted':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'document_viewed':
        return <Eye className="h-4 w-4 text-muted-foreground" />;
      case 'document_updated':
      case 'document_edited':
        return <Edit className="h-4 w-4 text-orange-500" />;
      case 'document_approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'document_rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'document_assigned':
        return <User className="h-4 w-4 text-purple-500" />;
      case 'comment_added':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'security_event':
        return <Shield className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityMessage = (activity: ActivityItem) => {
    const userName = activity.profile?.full_name || 'Unknown User';
    const { event, metadata } = activity;

    switch (event) {
      case 'document_created':
        return `${userName} created the document`;
      case 'document_uploaded':
        return `${userName} uploaded the document`;
      case 'document_submitted':
        return `${userName} submitted the document for review`;
      case 'document_viewed':
        return `${userName} viewed the document`;
      case 'document_updated':
      case 'document_edited':
        return `${userName} edited the document`;
      case 'document_approved':
        return `${userName} approved the document`;
      case 'document_rejected':
        const reason = metadata?.rejection_reason;
        return `${userName} rejected the document${reason ? `: ${reason}` : ''}`;
      case 'document_assigned':
        const reviewerName = metadata?.reviewer_name || 'a reviewer';
        return `${userName} assigned the document to ${reviewerName}`;
      case 'comment_added':
        return `${userName} added a comment`;
      case 'security_event':
        return `Security event: ${metadata?.event_type || 'Unknown'}`;
      default:
        return `${userName} performed an action: ${event}`;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'legal_reviewer':
        return 'default';
      case 'client':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Document Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Document Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2" />
              <p>No activity recorded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={activity.profile?.avatar_url} />
                    <AvatarFallback>
                      {getInitials(activity.profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      {getActivityIcon(activity.event, activity.success)}
                      <p className="text-sm font-medium leading-none">
                        {getActivityMessage(activity)}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                      {activity.profile?.role && (
                        <Badge 
                          variant={getRoleBadgeVariant(activity.profile.role)} 
                          className="text-xs"
                        >
                          {activity.profile.role}
                        </Badge>
                      )}
                    </div>
                    
                    {!activity.success && (
                      <p className="text-xs text-destructive mt-1">
                        Action failed
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}