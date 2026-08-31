/** Active loans with days-remaining plus full borrowing history and returns. */
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookMarked, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  EmptyState,
  ErrorState,
  Guard,
  LoadingRows,
  Page,
  StatusBadge,
} from '@/components/shell';
import { api, apiError, dueLabel, formatDate, formatNaira, Transaction } from '@/lib/api';

function LoanCard({
  txn,
  onReturn,
  returning,
}: {
  txn: Transaction;
  onReturn: (txn: Transaction) => void;
  returning: boolean;
}) {
  return (
    <li
      className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-center ${txn.isOverdue ? 'bg-destructive/5' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{txn.bookTitle}</p>
          {txn.isOverdue ? (
            <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
              Overdue
            </Badge>
          ) : (
            <StatusBadge status="BORROWED" />
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {txn.bookAuthor} · Accession {txn.accessionNumber}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Borrowed {formatDate(txn.borrowDate)} · Due {formatDate(txn.dueDate)}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <span
          className={`w-40 text-sm font-medium tnum ${txn.isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}
        >
          {dueLabel(txn)}
        </span>
        <Button
          size="sm"
          variant={txn.isOverdue ? 'destructive' : 'default'}
          disabled={returning}
          onClick={() => onReturn(txn)}
        >
          {returning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Recording…
            </>
          ) : (
            'Return book'
          )}
        </Button>
      </div>
    </li>
  );
}

function MyBooksBody() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['my-transactions'],
    queryFn: api.myTransactions,
  });

  const recordReturn = useMutation({
    mutationFn: (txn: Transaction) => api.return(txn.id),
    onSuccess: (result) => {
      if (result.fineAmount > 0) {
        toast.warning(`"${result.bookTitle}" returned ${result.daysLate} day(s) late`, {
          description: `A fine of ${formatNaira(result.fineAmount)} has been recorded on your account. Settle it at the circulation desk.`,
        });
      } else {
        toast.success(`"${result.bookTitle}" returned on time`, {
          description: 'No fine was charged. Thank you.',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['my-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['session'] });
    },
    onError: (err) => {
      toast.error('Could not record the return', { description: apiError(err) });
    },
  });

  const items = data?.items ?? [];
  const active = items.filter((t) => !t.returnDate);
  const history = items.filter((t) => t.returnDate);

  return (
    <Page
      title="My Books"
      description="Everything you currently hold, with due dates and days remaining, plus your complete borrowing history."
      actions={
        <Button variant="outline" asChild>
          <Link to="/catalogue">Borrow another book</Link>
        </Button>
      }
    >
      {isLoading ? (
        <LoadingRows rows={4} />
      ) : isError ? (
        <ErrorState message={apiError(error)} onRetry={() => refetch()} />
      ) : (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">On loan ({active.length})</TabsTrigger>
            <TabsTrigger value="history">History ({history.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {active.length === 0 ? (
              <EmptyState
                icon={<BookMarked className="h-6 w-6" aria-hidden="true" />}
                title="Nothing on loan right now"
                description={`You can hold up to ${data?.stats.borrowLimit ?? 3} books at a time. Browse the catalogue to find your next read.`}
                action={
                  <Button asChild>
                    <Link to="/catalogue">Search the catalogue</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border bg-card">
                {active.map((txn) => (
                  <LoanCard
                    key={txn.id}
                    txn={txn}
                    onReturn={(item) => recordReturn.mutate(item)}
                    returning={recordReturn.isPending && recordReturn.variables?.id === txn.id}
                  />
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {history.length === 0 ? (
              <EmptyState
                title="No completed loans yet"
                description="Once you return a book it moves here, together with the return date and any fine that was charged."
              />
            ) : (
              <div className="overflow-x-auto rounded-md border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Book</TableHead>
                      <TableHead>Borrowed</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Returned</TableHead>
                      <TableHead className="text-right">Fine</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell>
                          <p className="font-medium">{txn.bookTitle}</p>
                          <p className="text-sm text-muted-foreground">{txn.bookAuthor}</p>
                        </TableCell>
                        <TableCell className="tnum">{formatDate(txn.borrowDate)}</TableCell>
                        <TableCell className="tnum">{formatDate(txn.dueDate)}</TableCell>
                        <TableCell className="tnum">{formatDate(txn.returnDate)}</TableCell>
                        <TableCell
                          className={`text-right tnum ${txn.fineAmount > 0 ? 'font-medium text-destructive' : 'text-muted-foreground'}`}
                        >
                          {txn.fineAmount > 0 ? formatNaira(txn.fineAmount) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </Page>
  );
}

export default function MyBooks() {
  return (
    <Guard role="USER">
      <MyBooksBody />
    </Guard>
  );
}