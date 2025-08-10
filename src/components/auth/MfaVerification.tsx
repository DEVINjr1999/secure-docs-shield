import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MfaVerificationProps {
  onSuccess: () => void;
  onCancel: () => void;
  userEmail: string;
  userId: string;
}

export function MfaVerification({ onSuccess, onCancel, userEmail, userId }: MfaVerificationProps) {
  const [questions, setQuestions] = useState<{ id: string; question: string }[]>([]);
  const [answers, setAnswers] = useState<string[]>(['', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [initError, setInitError] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setInitError('');
        const uid = userId;
        if (!uid) throw new Error('Not authenticated');

        const { data, error } = await supabase
          .from('security_questions')
          .select('id, question')
          .eq('user_id', uid)
          .eq('is_active', true)
          .limit(2);
        if (error) throw error;

        if (!data || data.length < 2) {
          setInitError('Security questions are not set up for this account.');
          return;
        }
        setQuestions(data);
      } catch (e: any) {
        console.error('MFA (questions) init failed:', e);
        setInitError(e.message || 'Failed to load security questions.');
      }
    };
    loadQuestions();
  }, []);

  const verifyWithAnswers = async () => {
    if (answers.some((a) => !a) || questions.length < 2) return;
    setIsVerifying(true);
    try {
      const uid = userId;
      if (!uid) throw new Error('Not authenticated');

      const payload = questions.map((q, idx) => ({ id: q.id, answer: answers[idx] }));
      const { data, error } = await supabase.rpc('verify_security_answers', {
        p_user_id: uid,
        p_answers: payload as any,
      });
      if (error) throw error;

      if (data === true) {
        toast({ title: 'MFA Verified', description: 'Authentication completed successfully.' });
        onSuccess();
      } else {
        setAttemptsLeft((n) => n - 1);
        toast({ title: 'Verification Failed', description: 'Answers did not match. Please try again.', variant: 'destructive' });
      }
    } catch (error: any) {
      console.error('MFA verify (questions) error:', error);
      setAttemptsLeft((n) => n - 1);
      toast({ title: 'Verification Failed', description: error?.message || 'Failed to verify answers', variant: 'destructive' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') verifyWithAnswers();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center gap-2 justify-center">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>Answer your security questions for {userEmail}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(attemptsLeft < 3 || initError) && (
          <Alert variant={initError ? 'destructive' : 'default'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {initError ? initError : `${attemptsLeft} verification attempts remaining`}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div key={q.id} className="space-y-2">
              <Label htmlFor={`answer-${idx}`}>{q.question}</Label>
              <Input
                id={`answer-${idx}`}
                placeholder="Your answer"
                value={answers[idx] || ''}
                onChange={(e) => {
                  const next = [...answers];
                  next[idx] = e.target.value;
                  setAnswers(next);
                }}
                onKeyPress={handleKeyPress}
                autoComplete="off"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={verifyWithAnswers} disabled={isVerifying || answers.some((a) => !a) || !!initError} className="flex-1">
            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
