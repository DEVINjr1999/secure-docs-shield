import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PenTool, Type, Save, Trash2, FileSignature } from 'lucide-react';

interface ESignatureProps {
  documentId: string;
  documentTitle: string;
  onSignatureComplete?: (signatureData: string) => void;
}

export function ESignature({ documentId, documentTitle, onSignatureComplete }: ESignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('draw');
  const [typedSignature, setTypedSignature] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(devicePixelRatio, devicePixelRatio);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
    }
  }, [open]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (signatureMode !== 'draw') return;
    
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || signatureMode !== 'draw') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setTypedSignature('');
  };

  const generateTypedSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !typedSignature.trim()) return;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '32px cursive';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2);
    }
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !user) return;

    setSaving(true);
    try {
      // Check if there's any signature content
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasContent = imageData.data.some(pixel => pixel !== 0);
      
      if (!hasContent && !typedSignature.trim()) {
        toast({
          title: "Error",
          description: "Please provide a signature before saving",
          variant: "destructive"
        });
        return;
      }

      // Generate typed signature if in type mode
      if (signatureMode === 'type' && typedSignature.trim()) {
        generateTypedSignature();
      }

      // Convert canvas to blob
      const signatureDataUrl = canvas.toDataURL('image/png');
      
      // Create a signature record in the database
      const { error: signatureError } = await supabase
        .from('document_signatures')
        .insert({
          document_id: documentId,
          signer_id: user.id,
          signature_data: signatureDataUrl,
          signature_type: signatureMode,
          signed_at: new Date().toISOString(),
          signature_method: signatureMode === 'draw' ? 'drawn' : 'typed',
          signature_text: signatureMode === 'type' ? typedSignature : null
        });

      if (signatureError) throw signatureError;

      // Log audit event
      await supabase.rpc('log_audit_event', {
        p_user_id: user.id,
        p_event: 'document_signed',
        p_action_type: 'document',
        p_document_id: documentId,
        p_metadata: {
          signature_method: signatureMode,
          document_title: documentTitle,
          signed_by: user.id
        }
      });

      toast({
        title: "Success",
        description: "Document signed successfully",
      });

      // Call callback if provided
      if (onSignatureComplete) {
        onSignatureComplete(signatureDataUrl);
      }

      setOpen(false);
      clearSignature();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save signature",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <FileSignature className="h-4 w-4 mr-2" />
          Sign Document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Electronic Signature</DialogTitle>
          <DialogDescription>
            Sign the document "{documentTitle}" electronically
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Signature Mode Toggle */}
          <div className="flex space-x-2">
            <Button
              variant={signatureMode === 'draw' ? 'default' : 'outline'}
              onClick={() => setSignatureMode('draw')}
              size="sm"
            >
              <PenTool className="h-4 w-4 mr-2" />
              Draw
            </Button>
            <Button
              variant={signatureMode === 'type' ? 'default' : 'outline'}
              onClick={() => setSignatureMode('type')}
              size="sm"
            >
              <Type className="h-4 w-4 mr-2" />
              Type
            </Button>
          </div>

          {/* Typed Signature Input */}
          {signatureMode === 'type' && (
            <div className="space-y-2">
              <Label htmlFor="typed-signature">Type your full name</Label>
              <Input
                id="typed-signature"
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                placeholder="Enter your full name"
                onKeyUp={generateTypedSignature}
              />
            </div>
          )}

          {/* Signature Canvas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {signatureMode === 'draw' ? 'Draw your signature' : 'Signature preview'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg">
                <canvas
                  ref={canvasRef}
                  className="w-full h-40 cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
              
              <div className="flex justify-between mt-4">
                <Button variant="outline" onClick={clearSignature} size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                
                <div className="text-xs text-muted-foreground">
                  {signatureMode === 'draw' 
                    ? 'Use your mouse to draw your signature' 
                    : 'Type your name above to generate signature'
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signer Information */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="font-medium">Signer</Label>
                  <p className="text-muted-foreground">{user?.email}</p>
                </div>
                <div>
                  <Label className="font-medium">Date & Time</Label>
                  <p className="text-muted-foreground">
                    {new Date().toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={saveSignature} 
            disabled={saving}
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Sign Document
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}