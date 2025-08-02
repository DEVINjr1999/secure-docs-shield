import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { decryptData } from '@/lib/encryption';
import { Lock, Unlock, AlertCircle } from 'lucide-react';

interface DocumentDecryptionProps {
  encryptedContent: string;
  onDecrypted: (content: string) => void;
}

export function DocumentDecryption({ encryptedContent, onDecrypted }: DocumentDecryptionProps) {
  const [decryptionKey, setDecryptionKey] = useState('');
  const [error, setError] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);

  const handleDecrypt = async () => {
    if (!decryptionKey) {
      setError('Please enter a decryption key');
      return;
    }

    setIsDecrypting(true);
    setError('');

    try {
      const decryptedContent = decryptData(encryptedContent, decryptionKey);
      
      if (!decryptedContent) {
        throw new Error('Failed to decrypt content');
      }

      onDecrypted(decryptedContent);
    } catch (err) {
      setError('Invalid decryption key or corrupted data');
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDecrypt();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Lock className="h-5 w-5" />
          Document Encrypted
        </CardTitle>
        <CardDescription>
          Enter the decryption key to view the document content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input
            type="password"
            placeholder="Enter decryption key"
            value={decryptionKey}
            onChange={(e) => setDecryptionKey(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Button 
          onClick={handleDecrypt} 
          disabled={isDecrypting || !decryptionKey}
          className="w-full"
        >
          <Unlock className="h-4 w-4 mr-2" />
          {isDecrypting ? 'Decrypting...' : 'Decrypt Document'}
        </Button>
      </CardContent>
    </Card>
  );
}