import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Key, FileText, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fetchSharedKey } from '@/lib/keyShares';
import { format } from 'date-fns';

interface SharedDocument {
  id: string;
  title: string;
  document_type: string;
  status: string;
  created_at: string;
  shared_at: string;
  expires_at: string | null;
  shared_by_name: string;
}

export function SharedKeyReceiver() {
  const [sharedDocuments, setSharedDocuments] = useState<SharedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadSharedDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('document_key_shares')
        .select(`
          document_id,
          created_at,
          expires_at,
          shared_by
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch documents and profiles separately
      const formattedDocs = await Promise.all(
        (data || []).map(async (share) => {
          const [docResult, profileResult] = await Promise.all([
            supabase
              .from('documents')
              .select('id, title, document_type, status, created_at')
              .eq('id', share.document_id)
              .single(),
            supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', share.shared_by)
              .single()
          ]);

          return {
            id: docResult.data?.id || '',
            title: docResult.data?.title || 'Unknown',
            document_type: docResult.data?.document_type || 'Unknown',
            status: docResult.data?.status || 'Unknown',
            created_at: docResult.data?.created_at || '',
            shared_at: share.created_at,
            expires_at: share.expires_at,
            shared_by_name: profileResult.data?.full_name || 'Unknown'
          };
        })
      );

      setSharedDocuments(formattedDocs);
    } catch (error) {
      console.error('Error loading shared documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shared documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDocument = async (documentId: string) => {
    try {
      // Check if we can fetch the shared key
      const sharedKey = await fetchSharedKey(documentId);
      
      if (!sharedKey) {
        toast({
          title: 'Access Denied',
          description: 'No valid shared key found for this document',
          variant: 'destructive',
        });
        return;
      }

      // Navigate to document view with the shared key
      navigate(`/app/documents/${documentId}/view?sharedKey=${encodeURIComponent(sharedKey)}`);
      
    } catch (error) {
      console.error('Error accessing shared document:', error);
      toast({
        title: 'Error',
        description: 'Failed to access document',
        variant: 'destructive',
      });
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) <= new Date();
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'under_review': return 'default';
      case 'approved': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  useEffect(() => {
    loadSharedDocuments();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading shared documents...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Key className="h-5 w-5 mr-2" />
          Shared Documents
        </CardTitle>
        <CardDescription>
          Documents with shared encryption keys
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sharedDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No shared documents available
            </div>
          ) : (
            sharedDocuments.map((doc) => (
              <div key={doc.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{doc.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{doc.document_type}</span>
                      <span>•</span>
                      <span>Shared by: {doc.shared_by_name}</span>
                      <span>•</span>
                      <span>Shared: {format(new Date(doc.shared_at), 'MMM d, yyyy HH:mm')}</span>
                      {doc.expires_at && (
                        <>
                          <span>•</span>
                          <span className={isExpired(doc.expires_at) ? 'text-destructive' : ''}>
                            Expires: {format(new Date(doc.expires_at), 'MMM d, yyyy HH:mm')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isExpired(doc.expires_at) && (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Expired
                      </Badge>
                    )}
                    {doc.expires_at && !isExpired(doc.expires_at) && (
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        Expires Soon
                      </Badge>
                    )}
                    <Badge variant={getStatusVariant(doc.status)}>
                      {doc.status.replace('_', ' ')}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => handleOpenDocument(doc.id)}
                      disabled={isExpired(doc.expires_at)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Open Document
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}