/**
 * Application shell: header + navigation, route guards and the three
 * data-screen states (loading skeleton, error with retry, empty with CTA).
 */
import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BookOpen,
  CircleUser,
  Inbox,
  Library,
  LogOut,
  Menu,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api, client, Session } from '@/lib/api';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------- session */

export function useSession() {
  return useQuery<Session>({ queryKey: ['session'], queryFn: api.session, retry: false });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return async () => {
    try {
      await client.auth.logout();
    } finally {
      queryClient.clear();
      window.location.href = '/';
    }
  };
}

/* --------------------------------------------------------- state blocks */

export function LoadingRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-busy="true" aria-label="Loading records">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 rounded-md border border-border bg-card p-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function LoadingCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-3 rounded-md border border-border bg-card p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-6">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        <h3 className="text-base font-semibold">We couldn't load this</h3>
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border bg-card px-6 py-12 text-center">
      <div className="rounded-full bg-accent p-3 text-accent-foreground">
        {icon ?? <Inbox className="h-6 w-6" aria-hidden="true" />}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    ACTIVE: 'bg-accent text-accent-foreground',
    PENDING_APPROVAL: 'border-transparent bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]',
    INACTIVE: 'bg-muted text-muted-foreground',
    BORROWED: 'bg-accent text-accent-foreground',
    RETURNED: 'bg-muted text-muted-foreground',
    OVERDUE: 'bg-destructive/10 text-destructive',
  };
  const label = status.replace('_', ' ').toLowerCase();
  return (
    <Badge variant="outline" className={cn('capitalize', tone[status] ?? 'bg-muted text-muted-foreground')}>
      {label}
    </Badge>
  );
}

/* ------------------------------------------------------------ navigation */

interface NavItem {
  to: string;
  label: string;
}

const USER_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/catalogue', label: 'Catalogue' },
  { to: '/my-books', label: 'My Books' },
];

const ADMIN_NAV: NavItem[] = [
  { to: '/admin/books', label: 'Books' },
  { to: '/admin/members', label: 'Members' },
  { to: '/admin/transactions', label: 'Circulation' },
  { to: '/admin/reports', label: 'Reports' },
];

const GUEST_NAV: NavItem[] = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
];

function navFor(session?: Session): NavItem[] {
  if (!session?.authenticated || !session.member) return GUEST_NAV;
  return session.member.role === 'ADMIN' ? ADMIN_NAV : USER_NAV;
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  return (
    <>
      {items.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200',
              active
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:md:bg-secondary hover:md:text-foreground',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function Header() {
  const { data: session, isLoading } = useSession();
  const signOut = useSignOut();
  const items = navFor(session);
  const authed = Boolean(session?.authenticated);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-[2px]">
      <div className="mx-auto flex h-16 max-w-screen-xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Library className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-base font-bold">UniJos Library</span>
            <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">
              Management System
            </span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          <NavLinks items={items} />
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-2">
          {isLoading ? (
            <Skeleton className="h-9 w-24 rounded-md" />
          ) : authed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account menu">
                  <CircleUser className="h-5 w-5" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                  {session?.member ? `${session.member.role} account` : 'Signed in'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="gap-2">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">Register</Link>
              </Button>
            </div>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <nav className="mt-8 flex flex-col gap-1">
                <NavLinks items={items} />
                {!authed && (
                  <>
                    <Link
                      to="/login"
                      className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground"
                    >
                      Register
                    </Link>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border py-8">
      <div className="mx-auto flex max-w-screen-xl flex-col gap-2 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>University of Jos · Main Library, Bauchi Road Campus, Plateau State</p>
        <Link to="/about" className="hover:text-foreground">
          About this system
        </Link>
      </div>
    </footer>
  );
}

export function Page({
  title,
  description,
  actions,
  children,
  wide,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className={cn('mx-auto w-full flex-1 px-4 py-8 sm:px-6 lg:px-8', wide ? 'max-w-screen-2xl' : 'max-w-screen-xl')}>
        {title && (
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1.5">
              <h1 className="font-display text-3xl">{title}</h1>
              {description && <p className="max-w-prose text-sm text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </main>
      <Footer />
    </div>
  );
}

/* ---------------------------------------------------------------- guard */

/**
 * Route protection. Never auto-redirects to the OIDC callback: unauthenticated
 * visitors get an explicit sign-in call to action, and members whose account is
 * pending or inactive get an explanation instead of a blank screen.
 */
export function Guard({ role, children }: { role: 'USER' | 'ADMIN' | 'ANY'; children: ReactNode }) {
  const { data: session, isLoading, isError, error, refetch } = useSession();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Page>
        <div className="space-y-6">
          <Skeleton className="h-9 w-64" />
          <LoadingCards />
          <LoadingRows rows={4} />
        </div>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page title="Library">
        <ErrorState
          message={
            (error as Error)?.message ||
            'The library service did not respond. Check your connection and try again.'
          }
          onRetry={() => refetch()}
        />
      </Page>
    );
  }

  if (!session?.authenticated) {
    return (
      <Page>
        <div className="mx-auto max-w-md">
          <EmptyState
            icon={<BookOpen className="h-6 w-6" aria-hidden="true" />}
            title="Sign in to continue"
            description="This area holds member records and circulation data. Sign in with your university account to continue."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => client.auth.toLogin()}>Sign in</Button>
                <Button variant="outline" onClick={() => navigate('/register')}>
                  Register as a member
                </Button>
              </div>
            }
          />
        </div>
      </Page>
    );
  }

  if (session.needsRegistration || !session.member) {
    return (
      <Page>
        <div className="mx-auto max-w-md">
          <EmptyState
            title="Finish your library registration"
            description="Your sign-in worked, but you do not have a library membership yet. Complete the short registration form and a librarian will approve it."
            action={<Button onClick={() => navigate('/register')}>Complete registration</Button>}
          />
        </div>
      </Page>
    );
  }

  const member = session.member;

  if (member.status === 'PENDING_APPROVAL') {
    return (
      <Page>
        <div className="mx-auto max-w-md">
          <EmptyState
            title="Awaiting librarian approval"
            description="Your membership request has been received. A librarian reviews new registrations from the Members desk — you will be able to borrow as soon as it is approved."
            action={<Button variant="outline" onClick={() => navigate('/about')}>Learn about the library</Button>}
          />
        </div>
      </Page>
    );
  }

  if (member.status === 'INACTIVE') {
    return (
      <Page>
        <div className="mx-auto max-w-md">
          <EmptyState
            title="Membership inactive"
            description="This membership has been deactivated. Please visit the circulation desk at the Main Library to reactivate your account."
          />
        </div>
      </Page>
    );
  }

  if (role !== 'ANY' && member.role !== role) {
    const home = member.role === 'ADMIN' ? '/admin/reports' : '/dashboard';
    return (
      <Page>
        <div className="mx-auto max-w-md">
          <EmptyState
            icon={<AlertTriangle className="h-6 w-6" aria-hidden="true" />}
            title="You don't have access to this page"
            description={
              member.role === 'ADMIN'
                ? 'This page belongs to the member area. Librarians work from the administration pages.'
                : 'This page is restricted to library staff.'
            }
            action={<Button onClick={() => navigate(home)}>Go to my area</Button>}
          />
        </div>
      </Page>
    );
  }

  return <>{children}</>;
}