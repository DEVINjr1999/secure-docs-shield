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
  Shield,
  LogIn,
  Settings
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ActivityItem {
  id: string;
  event: string;
  action_type: string;
  created_at: string;
  user_id: string;
  metadata: any;
  success: boolean;
  document_id?: string;
  // Profile data will be joined
  profile?: {
    full_name: string;
    avatar_url: string;
    role: string;
  };
}

interface UserActivityFeedProps {
  className?: string;
  limit?: number;
}

export default function UserActivityFeed({ className, limit = 10 }: UserActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadActivities();
    }
  }, [user, limit]);

  const loadActivities = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get audit logs for this user with profile information
      const { data: auditData, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          event,
          action_type,
          created_at,
          user_id,
          metadata,
          success,
          document_id
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Get profile data for the user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
      }

      // Transform the data to include profile info
      const transformedData = auditData?.map(item => ({
        ...item,
        profile: profileData || null
      })) || [];

      setActivities(transformedData);
    } catch (error) {
      console.error('Error loading activities:', error);
      toast({
        title: "Error",
        description: "Failed to load recent activity.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (event: string, success: boolean) => {
    if (!success) return <XCircle className="h-4 w-4 text-destructive" />;
    
    switch (event) {
      case 'user_registered':
      case 'user_login':
        return <LogIn className="h-4 w-4 text-green-500" />;
      case 'profile_updated':
        return <Settings className="h-4 w-4 text-blue-500" />;
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
      case 'comment_added':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'security_event':
        return <Shield className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityMessage = (activity: ActivityItem) => {
    const { event, metadata, document_id } = activity;

    switch (event) {
      case 'user_registered':
        return 'You joined the platform';
      case 'user_login':
        return 'You logged in';
      case 'profile_updated':
        return 'You updated your profile';
      case 'document_created':
        return document_id ? `You created a document` : 'You created a document';
      case 'document_uploaded':
        return document_id ? `You uploaded a document` : 'You uploaded a document';
      case 'document_submitted':
        return document_id ? `You submitted a document for review` : 'You submitted a document for review';
      case 'document_viewed':
        return document_id ? `You viewed a document` : 'You viewed a document';
      case 'document_updated':
      case 'document_edited':
        return document_id ? `You edited a document` : 'You edited a document';
      case 'document_approved':
        return document_id ? `Your document was approved` : 'Your document was approved';
      case 'document_rejected':
        const reason = metadata?.rejection_reason;
        return `Your document was rejected${reason ? `: ${reason}` : ''}`;
      case 'comment_added':
        return document_id ? `You added a comment to a document` : 'You added a comment';
      case 'security_event':
        return `Security event: ${metadata?.event_type || 'Unknown'}`;
      default:
        return `You performed an action: ${event.replace(/_/g, ' ')}`;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading) {
    return (
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
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2" />
        <p>No recent activity</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-80">
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
    </ScrollArea>
  );
}