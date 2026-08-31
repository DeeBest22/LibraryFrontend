/** Member dashboard: quick stats plus shortcuts into the catalogue. */
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, BookMarked, CalendarClock, Coins, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  EmptyState,
  ErrorState,
  Guard,
  LoadingCards,
  LoadingRows,
  Page,
  StatusBadge,
  useSession,
} from '@/components/shell';
import { api, apiError, dueLabel, formatDate, formatNaira } from '@/lib/api';

function DashboardBody() {
  const { data: session } = useSession();
  const member = session?.member;
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['my-transactions'],
    queryFn: api.myTransactions,
  });

  const stats = data?.stats;
  const active = (data?.items ?? []).filter((t) => !t.returnDate);

  return (
    <Page
      title={`Welcome back, ${member?.firstName ?? 'reader'}`}
      description={
        member?.matricNumber
          ? `${member.matricNumber} · ${member.department ?? 'University of Jos'}${member.level ? ` · Level ${member.level}` : ''}`
          : 'University of Jos Main Library'
      }
      actions={
        <Button asChild className="gap-2">
          <Link to="/catalogue">
            Browse catalogue
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-8">
          <LoadingCards />
          <LoadingRows rows={3} />
        </div>
      ) : isError ? (
        <ErrorState message={apiError(error)} onRetry={() => refetch()} />
      ) : (
        <div className="space-y-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <BookMarked className="h-4 w-4" aria-hidden="true" />
                  Books on loan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-3xl font-bold tnum">
                  {stats?.activeBorrows ?? 0}
                  <span className="ml-1 text-base font-medium text-muted-foreground">
                    / {stats?.borrowLimit ?? 3}
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                  Due within 3 days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-3xl font-bold tnum">{stats?.dueSoon ?? 0}</p>
              </CardContent>
            </Card>

            <Card className={stats?.overdue ? 'border-destructive/40' : undefined}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  Overdue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`font-display text-3xl font-bold tnum ${stats?.overdue ? 'text-destructive' : ''}`}
                >
                  {stats?.overdue ?? 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Coins className="h-4 w-4" aria-hidden="true" />
                  Fines recorded
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-3xl font-bold tnum">
                  {formatNaira(stats?.totalFines ?? 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          <section>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="font-display text-2xl">Current loans</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/my-books">View all &amp; return</Link>
              </Button>
            </div>

            {active.length === 0 ? (
              <EmptyState
                icon={<Library className="h-6 w-6" aria-hidden="true" />}
                title="You have no books on loan"
                description={`You can hold up to ${stats?.borrowLimit ?? 3} books at a time for ${session?.config.loanPeriodDays ?? 14} days each. Find something to read in the catalogue.`}
                action={
                  <Button asChild>
                    <Link to="/catalogue">Search the catalogue</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border bg-card">
                {active.map((txn) => (
                  <li key={txn.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{txn.bookTitle}</p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {txn.bookAuthor} · Due {formatDate(txn.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-medium tnum ${txn.isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}
                      >
                        {dueLabel(txn)}
                      </span>
                      <StatusBadge status={txn.isOverdue ? 'OVERDUE' : txn.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Page>
  );
}

export default function Dashboard() {
  return (
    <Guard role="USER">
      <DashboardBody />
    </Guard>
  );
}