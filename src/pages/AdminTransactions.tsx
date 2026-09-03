/**
 * Admin: every borrow/return record, filterable, with borrow-on-behalf and a
 * manual "mark as returned" action.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  EmptyState,
  ErrorState,
  Guard,
  LoadingRows,
  Page,
  StatusBadge,
} from '@/components/shell';
import { api, apiError, dueLabel, formatDate, formatNaira, Transaction } from '@/lib/api';

/** Issue a book to any member on their behalf. */
function IssueDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [memberId, setMemberId] = useState('');
  const [bookId, setBookId] = useState('');

  const { data: memberData } = useQuery({
    queryKey: ['admin-members', 'ACTIVE', ''],
    queryFn: () => api.members({ status: 'ACTIVE' }),
  });
  const { data: bookData } = useQuery({
    queryKey: ['admin-books', '', 'ALL'],
    queryFn: () => api.books({ availability: 'AVAILABLE' }),
  });

  const issue = useMutation({
    mutationFn: () => api.borrow(Number(bookId), Number(memberId)),
    onSuccess: (result) => {
      toast.success(`"${result.bookTitle}" issued`, {
        description: `Due back on ${formatDate(result.dueDate)}. ${result.availableCopies} cop${result.availableCopies === 1 ? 'y' : 'ies'} left on the shelf.`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      setMemberId('');
      setBookId('');
      onClose();
    },
    onError: (error) => {
      toast.error('Could not issue this book', { description: apiError(error) });
    },
  });

  const members = (memberData?.items ?? []).filter((m) => m.role === 'USER');
  const books = bookData?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Issue a book to a member</DialogTitle>
          <DialogDescription>
            The same rules apply as on the member side: the copy must be free and the member must be
            under the three-book limit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="issue-member">Member</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger id="issue-member">
                <SelectValue placeholder="Select an active member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={String(member.id)}>
                    {member.fullName}
                    {member.matricNumber ? ` · ${member.matricNumber}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue-book">Book</Label>
            <Select value={bookId} onValueChange={setBookId}>
              <SelectTrigger id="issue-book">
                <SelectValue placeholder="Select an available title" />
              </SelectTrigger>
              <SelectContent>
                {books.map((book) => (
                  <SelectItem key={book.id} value={String(book.id)}>
                    {book.title} · {book.availableCopies} free
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!memberId || !bookId || issue.isPending}
            onClick={() => issue.mutate()}
          >
            {issue.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Issuing…
              </>
            ) : (
              'Issue book'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminTransactionsBody() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [issueOpen, setIssueOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-transactions', status, submitted],
    queryFn: () => api.transactions({ status, search: submitted }),
  });

  const markReturned = useMutation({
    mutationFn: (txn: Transaction) => api.return(txn.id),
    onSuccess: (result) => {
      if (result.fineAmount > 0) {
        toast.warning(`"${result.bookTitle}" returned ${result.daysLate} day(s) late`, {
          description: `Fine of ${formatNaira(result.fineAmount)} recorded on the transaction.`,
        });
      } else {
        toast.success(`"${result.bookTitle}" returned on time`, { description: 'No fine charged.' });
      }
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
    onError: (err) => {
      toast.error('Could not record the return', { description: apiError(err) });
    },
  });

  const items = data?.items ?? [];

  return (
    <Page
      title="Circulation"
      description="Every issue and return recorded by the library, with overdue flags and the fines charged on late returns."
      wide
      actions={
        <Button className="gap-2" onClick={() => setIssueOpen(true)}>
          <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
          Issue a book
        </Button>
      }
    >
      <form
        className="mb-6 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(search.trim());
        }}
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            placeholder="Search by book title, accession number, member name or matriculation number"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search circulation records"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All records</SelectItem>
            <SelectItem value="ACTIVE">On loan</SelectItem>
            <SelectItem value="BORROWED">Borrowed (in time)</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="RETURNED">Returned</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {isLoading ? (
        <LoadingRows rows={6} />
      ) : isError ? (
        <ErrorState message={apiError(error)} onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight className="h-6 w-6" aria-hidden="true" />}
          title={
            submitted || status !== 'ALL' ? 'No records match these filters' : 'No circulation yet'
          }
          description={
            submitted || status !== 'ALL'
              ? 'Clear the search term or choose "All records" to see the full circulation history.'
              : 'Once a book is issued  here or by a member from the catalogue  the transaction appears in this list.'
          }
          action={
            status === 'ALL' && !submitted ? (
              <Button onClick={() => setIssueOpen(true)}>Issue the first book</Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setStatus('ALL');
                  setSearch('');
                  setSubmitted('');
                }}
              >
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Borrowed</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Returned</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Fine</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((txn) => (
                <TableRow key={txn.id} className={txn.isOverdue && !txn.returnDate ? 'bg-destructive/5' : ''}>
                  <TableCell>
                    <p className="font-medium">{txn.bookTitle}</p>
                    <p className="tnum text-xs text-muted-foreground">{txn.accessionNumber}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{txn.memberName}</p>
                    <p className="tnum text-xs text-muted-foreground">{txn.matricNumber ?? txn.memberEmail}</p>
                  </TableCell>
                  <TableCell className="tnum text-sm">{formatDate(txn.borrowDate)}</TableCell>
                  <TableCell className="tnum text-sm">
                    {formatDate(txn.dueDate)}
                    {!txn.returnDate && (
                      <p
                        className={`text-xs ${txn.isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}
                      >
                        {dueLabel(txn)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="tnum text-sm">{formatDate(txn.returnDate)}</TableCell>
                  <TableCell>
                    <StatusBadge status={txn.isOverdue && !txn.returnDate ? 'OVERDUE' : txn.status} />
                  </TableCell>
                  <TableCell
                    className={`text-right tnum ${txn.fineAmount > 0 ? 'font-medium text-destructive' : 'text-muted-foreground'}`}
                  >
                    {txn.fineAmount > 0 ? formatNaira(txn.fineAmount) : ''}
                  </TableCell>
                  <TableCell className="text-right">
                    {txn.returnDate ? (
                      <span className="text-sm text-muted-foreground">Closed</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={markReturned.isPending && markReturned.variables?.id === txn.id}
                        onClick={() => markReturned.mutate(txn)}
                      >
                        {markReturned.isPending && markReturned.variables?.id === txn.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                            Recording…
                          </>
                        ) : (
                          'Mark as returned'
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {issueOpen && <IssueDialog open={issueOpen} onClose={() => setIssueOpen(false)} />}
    </Page>
  );
}

export default function AdminTransactions() {
  return (
    <Guard role="ADMIN">
      <AdminTransactionsBody />
    </Guard>
  );
}