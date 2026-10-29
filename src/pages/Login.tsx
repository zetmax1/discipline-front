import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Brain, ArrowRight, Loader2, Play } from 'lucide-react';
import { setDemoMode } from '@/lib/api';
import { passwordPolicyError, PASSWORD_POLICY_HINT } from '@/lib/password-policy';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, register, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'login') {
        await login(email, password);
        toast('Welcome back!');
      } else {
        if (!name.trim()) {
          toast.error('Name is required');
          return;
        }
        const policyError = passwordPolicyError(password);
        if (policyError) {
          toast.error(policyError);
          return;
        }
        await register(name.trim(), email, password);
        toast('Account created successfully!');
      }
      navigate('/');
    } catch {
      toast.error(error || 'Authentication failed');
    }
  };

  const handleDemo = () => {
    setDemoMode();
    toast('Welcome! You are using the demo version. Data is saved locally.');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -right-[20%] w-[60%] h-[80%] rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute -bottom-[30%] -left-[15%] w-[50%] h-[70%] rounded-full bg-accent/[0.04] blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-lg shadow-primary/20">
            <Brain className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Discipline</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Track your focus. Build your habits.
          </p>
        </div>

        {/* Auth Card */}
        <Card className="border shadow-xl shadow-black/[0.03]">
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-xl">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Enter your credentials to continue'
                : 'Start your productivity journey'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="h-11"
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="h-11"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="h-11"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                {mode === 'register' && (
                  <p className="text-xs text-muted-foreground">{PASSWORD_POLICY_HINT}</p>
                )}
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </Button>
            </form>

            {/* Toggle mode */}
            <div className="mt-6 text-center">
              <span className="text-sm text-muted-foreground">
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              </span>
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setName('');
                  setEmail('');
                  setPassword('');
                }}
                className="ml-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </div>

            {/* Divider + demo */}
            <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground border-dashed"
              onClick={handleDemo}
            >
              <Play className="h-3.5 w-3.5 mr-2" />
              Try Demo Version
            </Button>
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              No account needed · Data saved locally
            </p>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Discipline creates freedom.
        </p>
      </div>
    </div>
  );
}
