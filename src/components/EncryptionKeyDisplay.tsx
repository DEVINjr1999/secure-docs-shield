import { useState } from 'react';
import { Copy, Download, Shield, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';

interface EncryptionKeyDisplayProps {
  encryptionKey: string;
  documentTitle: string;
  onContinue: () => void;
}

export function EncryptionKeyDisplay({ encryptionKey, documentTitle, onContinue }: EncryptionKeyDisplayProps) {
  const [showKey, setShowKey] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(encryptionKey);
      toast({
        title: 'Copied!',
        description: 'Encryption key copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy key to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadKey = () => {
    const keyData = `Document: ${documentTitle}
Upload Date: ${new Date().toLocaleString()}
Encryption Key: ${encryptionKey}

IMPORTANT: Keep this key safe! You will need it to decrypt and view your document.
If you lose this key, your document will be permanently inaccessible.`;

    const blob = new Blob([keyData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentTitle.replace(/[^a-zA-Z0-9]/g, '_')}_encryption_key.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Downloaded!',
      description: 'Encryption key saved as text file',
    });
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Document Uploaded Successfully!</CardTitle>
          <CardDescription className="text-base">
            Your document "{documentTitle}" has been securely uploaded and encrypted.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              <strong>CRITICAL: Save Your Encryption Key</strong>
              <br />
              This key is required to decrypt and view your document. If you lose it, 
              your document will be permanently inaccessible. We cannot recover lost keys.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Encryption Key:</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={encryptionKey}
                    readOnly
                    className="pr-10 font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button onClick={handleCopyKey} variant="outline" size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleDownloadKey} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download Key as File
              </Button>
              <Button onClick={handleCopyKey} variant="outline" className="flex-1">
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </Button>
            </div>
          </div>

          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-sm">Security Best Practices:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Store the key in a secure password manager</li>
              <li>• Keep a backup copy in a safe location</li>
              <li>• Never share the key via email or unsecured messaging</li>
              <li>• You'll need this key to view your document later</li>
            </ul>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="acknowledge"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="acknowledge" className="text-sm cursor-pointer">
              I understand that I must save this encryption key to access my document later
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              onClick={onContinue}
              disabled={!acknowledged}
              className="flex-1"
            >
              I've Saved My Key - Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}