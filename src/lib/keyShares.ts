import { supabase } from '@/integrations/supabase/client';

// Create a key share for a document so the assigned reviewer can decrypt
export async function createKeyShare(documentId: string, keyValue: string, expiryHours?: number) {
  console.log('Creating key share for document:', documentId, 'expiry hours:', expiryHours);
  
  const expires_at = expiryHours && expiryHours > 0
    ? new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString()
    : null;

  const { data: user } = await supabase.auth.getUser();
  console.log('User creating key share:', user?.user?.id);

  const { error } = await supabase.from('document_key_shares').insert({
    document_id: documentId,
    shared_by: user?.user?.id,
    key_value: keyValue,
    expires_at,
  });

  if (error) {
    console.error('Key share creation error:', error);
    throw error;
  }
  
  console.log('Key share created successfully');
}

// Fetch the latest unexpired shared key for a document (reviewer side)
export async function fetchSharedKey(documentId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('document_key_shares')
    .select('key_value, created_at, expires_at')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  if (!data || data.length === 0) return null;

  const share = data[0];
  if (share.expires_at && new Date(share.expires_at) <= new Date()) return null;
  return share.key_value as string;
}
