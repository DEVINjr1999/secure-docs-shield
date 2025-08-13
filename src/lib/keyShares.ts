import { supabase } from '@/integrations/supabase/client';

// Create a key share for a document so the assigned reviewer can decrypt
export async function createKeyShare(documentId: string, keyValue: string, expiryHours?: number) {
  const expires_at = expiryHours && expiryHours > 0
    ? new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await supabase.from('document_key_shares').insert({
    document_id: documentId,
    shared_by: (await supabase.auth.getUser()).data.user?.id,
    key_value: keyValue,
    expires_at,
  });

  if (error) throw error;
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
