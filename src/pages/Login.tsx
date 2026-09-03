/** Login page. Authentication is delegated to the platform identity provider. */
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Footer, Header, useSession } from '@/components/shell';
import { client } from '@/lib/api';

export default function Login() {
  const { data: session, isLoading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (session?.authenticated) {
      if (session.needsRegistration) navigate('/register', { replace: true });
      else if (session.member?.role === 'ADMIN') navigate('/admin/reports', { replace: true });
      else navigate('/dashboard', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.authenticated, session?.needsRegistration, session?.member?.role]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="relative flex-1 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, hsl(var(--border)) 0, hsl(var(--border)) 1px, transparent 1px, transparent 44px)',
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto flex w-full max-w-md items-center px-4 py-16 sm:px-6">
          <div className="relative w-full">
            <div className="absolute -top-3 left-6 h-3 w-16 bg-primary" aria-hidden="true" />
            <Card className="w-full border-border pt-1 shadow-sm">
              <CardHeader>
                <span className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
                  <KeyRound className="h-5 w-5" aria-hidden="true" />
                </span>
                <CardTitle className="font-display text-2xl">Sign in to the library</CardTitle>
                <CardDescription>
                  Members and librarians use the same university account. Your role decides what you
                  see after signing in.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <Button
                  className="w-full shadow-sm shadow-primary/20 transition hover:brightness-110 active:scale-[0.99]"
                  size="lg"
                  disabled={isLoading}
                  onClick={() => client.auth.toLogin()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      Checking your session…
                    </>
                  ) : (
                    'Continue with university account'
                  )}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Not a member yet?{' '}
                  <Link
                    to="/register"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Register for library access
                  </Link>
                  . New accounts are activated once a librarian approves them.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}