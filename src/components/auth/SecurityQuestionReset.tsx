import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, Lock, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SecurityQuestionResetProps {
  onSuccess?: () => void;
}

interface Question { id: string; question: string }

export default function SecurityQuestionReset({ onSuccess }: SecurityQuestionResetProps) {
  const [stage, setStage] = useState<"init" | "challenge">("init");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fetchQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.functions.invoke("password-reset-questions", {
        body: { action: "init", email },
      });

      if (error || !data?.success) {
        setError(data?.message || error?.message || "Unable to load security questions.");
        return;
      }

      setQuestions(data.questions || []);
      setUserId(data.user_id);
      setStage("challenge");
      toast({ title: "Answer Questions", description: "Provide answers to reset your password." });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }
    if (newPassword.length < 12) {
      setError("Password must be at least 12 characters long");
      setIsLoading(false);
      return;
    }

    const answersArray = questions.map((q) => ({ id: q.id, answer: answers[q.id] || "" }));

    try {
      const { data, error } = await supabase.functions.invoke("password-reset-questions", {
        body: { action: "reset", user_id: userId, answers: answersArray, new_password: newPassword },
      });

      if (error || !data?.success) {
        setError(data?.message || error?.message || "Verification failed.");
        toast({ title: "Reset Failed", description: data?.message || error?.message, variant: "destructive" });
        return;
      }

      toast({ title: "Password Updated", description: "You can now sign in with your new password." });
      onSuccess?.();
    } catch (e: any) {
      setError(e.message);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (stage === "init") {
    return (
      <div className="mt-6">
        <div className="text-center mb-2 text-sm text-muted-foreground">Or reset via security questions</div>
        {error && (
          <Alert className="mb-4" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={fetchQuestions} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="sq-email">Account Email</Label>
            <Input
              id="sq-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading Questions...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Use Security Questions
              </>
            )}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleReset} className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="space-y-2">
            <Label htmlFor={`answer-${q.id}`}>{q.question}</Label>
            <Input
              id={`answer-${q.id}`}
              type="password"
              value={answers[q.id] || ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
              required
            />
          </div>
        ))}

        <div className="space-y-2">
          <Label htmlFor="new-password">New Password</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <p className="text-xs text-muted-foreground">Minimum 12 characters.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating Password...
            </>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" />
              Reset Password
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
