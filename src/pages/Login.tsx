import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Brain, ArrowRight, Loader2, Play } from 'lucide-react';
import { ApiError, setDemoMode } from '@/lib/api';
import { Turnstile } from '@/components/Turnstile';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/theme/ThemeSwitcher';
import { passwordPolicyError, passwordPolicyHint } from '@/lib/password-policy';
import { useI18n } from '@/i18n';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Registration always needs a captcha; login only after the server asks for one.
  const [loginCaptcha, setLoginCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const { login, register, loading, error } = useAuth();
  const { t, locale, errorMessage } = useI18n();
  const navigate = useNavigate();
  const showCaptcha = mode === 'register' || loginCaptcha;

  // Turnstile tokens are single-use: drop the token and remount the widget.
  const resetCaptcha = () => {
    setCaptchaToken(null);
    setCaptchaKey(k => k + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'login') {
        const token = loginCaptcha ? captchaToken ?? undefined : undefined;
        if (loginCaptcha) resetCaptcha();
        await login(email, password, token);
        toast(t('auth.welcomeToast'));
      } else {
        if (!name.trim()) {
          toast.error(t('auth.nameRequired'));
          return;
        }
        const policyError = passwordPolicyError(password, locale);
        if (policyError) {
          toast.error(policyError);
          return;
        }
        if (!captchaToken) {
          toast.error(t('auth.completeVerification'));
          return;
        }
        const token = captchaToken;
        resetCaptcha();
        await register(name.trim(), email, password, token);
        toast(t('auth.accountCreated'));
      }
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError && err.body.captchaRequired === true && mode === 'login') {
        setLoginCaptcha(true);
      }
      // Use the error just caught; the hook's `error` state is from the previous render.
      let message = errorMessage(err, 'auth.failed');
      if (err instanceof ApiError && err.status === 429 && err.retryAfter) {
        message += ' ' + t('auth.retryIn', { seconds: err.retryAfter });
      }
      toast.error(message);
    }
  };

  const handleDemo = () => {
    setDemoMode();
    toast(t('auth.demoWelcome'));
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('common.appName')}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t('auth.tagline')}
          </p>
        </div>

        {/* Auth Card */}
        <Card className="border shadow-xl shadow-black/[0.03]">
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-xl">
              {mode === 'login' ? t('auth.welcomeBack') : t('auth.createAccount')}
            </CardTitle>
            <CardDescription>
              {mode === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">{t('auth.name')}</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder={t('auth.namePlaceholder')}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="h-11"
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="h-11"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">{t('auth.password')}</Label>
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
                  <p className="text-xs text-muted-foreground">{passwordPolicyHint(locale)}</p>
                )}
              </div>

              {showCaptcha && <Turnstile key={`${mode}-${captchaKey}`} onToken={setCaptchaToken} />}

              {error != null && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {errorMessage(error, 'auth.failed')}
                </p>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold"
                disabled={loading || (showCaptcha && !captchaToken)}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                {mode === 'login' ? t('auth.signIn') : t('auth.createAccount')}
              </Button>
            </form>

            {/* Toggle mode */}
            <div className="mt-6 text-center">
              <span className="text-sm text-muted-foreground">
                {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}
              </span>
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setName('');
                  setEmail('');
                  setPassword('');
                  setLoginCaptcha(false);
                  resetCaptcha();
                }}
                className="ml-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                {mode === 'login' ? t('auth.signUp') : t('auth.signIn')}
              </button>
            </div>

            {/* Divider + demo */}
            <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground">{t('auth.or')}</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground border-dashed"
              onClick={handleDemo}
            >
              <Play className="h-3.5 w-3.5 mr-2" />
              {t('auth.tryDemo')}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              {t('auth.demoNote')}
            </p>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t('auth.motto')}
        </p>
      </div>
    </div>
  );
}
