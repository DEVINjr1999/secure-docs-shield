import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, Lock, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [canReset, setCanReset] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Parse hash fragment for tokens and type
        const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
        const params = new URLSearchParams(hash);
        const type = params.get("type");
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (type !== "recovery") {
          setError("Invalid or expired password reset link. Please request a new one.");
          setLoading(false);
          return;
        }

        // If tokens present, set session to allow updateUser
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }

        // Verify session exists
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError("Your reset link has expired or is invalid. Please request a new one.");
          setLoading(false);
          return;
        }

        setCanReset(true);
      } catch (e: any) {
        console.error("Reset init error:", e);
        setError("Could not verify reset link. Please request a new one.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 12) {
      setError("Password must be at least 12 characters long");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        toast({ title: "Reset Failed", description: error.message, variant: "destructive" });
        return;
      }

      // Clean hash from URL
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

      toast({ title: "Password Updated", description: "You can now sign in with your new password." });
      navigate("/auth", { replace: true });
    } catch (e: any) {
      setError(e.message);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary mr-2" />
            <h1 className="text-2xl font-bold">SecureLegal</h1>
          </div>
          <p className="text-muted-foreground">Reset your account password</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Set a New Password</CardTitle>
            <CardDescription>Enter and confirm your new password</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4" variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {canReset ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

                <Button type="submit" className="w-full">
                  <Lock className="mr-2 h-4 w-4" />
                  Update Password
                </Button>

                <Button type="button" variant="link" className="w-full" onClick={() => navigate("/auth")}>Back to Sign In</Button>
              </form>
            ) : (
              <div className="text-center text-muted-foreground">
                <p>We couldn't validate your reset link.</p>
                <Button type="button" variant="link" onClick={() => navigate("/auth")}>Return to Sign In</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
