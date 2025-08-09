import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import CryptoJS from 'crypto-js';

interface SecurityQuestionsSetupProps {
  onComplete: () => void;
  onCancel: () => void;
  userEmail: string;
}

export function SecurityQuestionsSetup({ onComplete, onCancel, userEmail }: SecurityQuestionsSetupProps) {
  const { toast } = useToast();
  const [q1, setQ1] = useState('');
  const [a1, setA1] = useState('');
  const [q2, setQ2] = useState('');
  const [a2, setA2] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const genSalt = () => Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const hashAnswer = (answer: string, salt: string) =>
    CryptoJS.SHA256(answer.trim().toLowerCase() + salt).toString(CryptoJS.enc.Hex);

  const handleEnable = async () => {
    if (!q1 || !a1 || !q2 || !a2) {
      toast({ title: 'Missing information', description: 'Please provide two questions and answers.' });
      return;
    }
    if (q1.trim() === q2.trim()) {
      toast({ title: 'Questions must differ', description: 'Please use two different questions.' });
      return;
    }

    setIsSaving(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw userErr || new Error('Not authenticated');
      const userId = userData.user.id;

      // Deactivate any previous questions
      await supabase.from('security_questions').update({ is_active: false }).eq('user_id', userId).eq('is_active', true);

      const salt1 = genSalt();
      const salt2 = genSalt();
      const payload = [
        { user_id: userId, question: q1.trim(), salt: salt1, answer_hash: hashAnswer(a1, salt1), is_active: true },
        { user_id: userId, question: q2.trim(), salt: salt2, answer_hash: hashAnswer(a2, salt2), is_active: true },
      ];

      const { error: insertErr } = await supabase.from('security_questions').insert(payload);
      if (insertErr) throw insertErr;

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ mfa_enabled: true, mfa_method: 'security_questions', mfa_verified_at: new Date().toISOString() })
        .eq('user_id', userId);
      if (profileErr) throw profileErr;

      toast({ title: 'MFA Enabled', description: 'Security questions have been set for your account.' });
      onComplete();
    } catch (e: any) {
      toast({ title: 'Setup failed', description: e.message || 'Unable to enable MFA', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Set up Security Questions
        </CardTitle>
        <CardDescription>Provide two questions and answers. We’ll ask these when signing in as MFA for {userEmail}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Use questions only you know. Avoid information that others can easily find (like birthdays or pet names).
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="q1">Question 1</Label>
            <Input id="q1" value={q1} onChange={(e) => setQ1(e.target.value)} placeholder="e.g., Where did you meet your best friend?" />
            <Label htmlFor="a1">Answer 1</Label>
            <Input id="a1" value={a1} onChange={(e) => setA1(e.target.value)} placeholder="Your answer" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="q2">Question 2</Label>
            <Input id="q2" value={q2} onChange={(e) => setQ2(e.target.value)} placeholder="e.g., What was your first job?" />
            <Label htmlFor="a2">Answer 2</Label>
            <Input id="a2" value={a2} onChange={(e) => setA2(e.target.value)} placeholder="Your answer" />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleEnable} disabled={isSaving} className="flex-1">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enable MFA
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
