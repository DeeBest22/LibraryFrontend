/** Admin: summary statistics and exportable member / catalogue / circulation reports. */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileBarChart } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  EmptyState,
  ErrorState,
  Guard,
  LoadingCards,
  LoadingRows,
  Page,
  StatusBadge,
} from '@/components/shell';
import {
  api,
  apiError,
  availabilityLabel,
  Book,
  CsvColumn,
  downloadCsv,
  formatDate,
  formatNaira,
  Member,
  toCsv,
  Transaction,
} from '@/lib/api';

const MEMBER_COLUMNS: CsvColumn<Member>[] = [
  { header: 'ID', value: (m) => m.id },
  { header: 'First name', value: (m) => m.firstName },
  { header: 'Last name', value: (m) => m.lastName },
  { header: 'E-mail', value: (m) => m.email },
  { header: 'Matric number', value: (m) => m.matricNumber ?? '' },
  { header: 'Department', value: (m) => m.department ?? '' },
  { header: 'Level', value: (m) => m.level ?? '' },
  { header: 'Role', value: (m) => m.role },
  { header: 'Status', value: (m) => m.status },
  { header: 'Registered', value: (m) => formatDate(m.createdAt) },
];

const BOOK_COLUMNS: CsvColumn<Book>[] = [
  { header: 'ID', value: (b) => b.id },
  { header: 'Title', value: (b) => b.title },
  { header: 'Author', value: (b) => b.author },
  { header: 'Accession number', value: (b) => b.accessionNumber },
  { header: 'ISBN', value: (b) => b.isbn ?? '' },
  { header: 'Publisher', value: (b) => b.publisher ?? '' },
  { header: 'Year', value: (b) => b.publicationYear ?? '' },
  { header: 'Category', value: (b) => b.category ?? '' },
  { header: 'Total copies', value: (b) => b.totalCopies },
  { header: 'Available copies', value: (b) => b.availableCopies },
];

const TXN_COLUMNS: CsvColumn<Transaction>[] = [
  { header: 'ID', value: (t) => t.id },
  { header: 'Book', value: (t) => t.bookTitle ?? '' },
  { header: 'Accession number', value: (t) => t.accessionNumber ?? '' },
  { header: 'Member', value: (t) => t.memberName ?? '' },
  { header: 'Matric number', value: (t) => t.matricNumber ?? '' },
  { header: 'Borrow date', value: (t) => formatDate(t.borrowDate) },
  { header: 'Due date', value: (t) => formatDate(t.dueDate) },
  { header: 'Return date', value: (t) => formatDate(t.returnDate) },
  { header: 'Status', value: (t) => (t.isOverdue && !t.returnDate ? 'OVERDUE' : t.status) },
  { header: 'Fine (NGN)', value: (t) => t.fineAmount.toFixed(2) },
];

function ExportButton<T>({
  rows,
  columns,
  filename,
  label,
}: {
  rows: T[];
  columns: CsvColumn<T>[];
  filename: string;
  label: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      disabled={rows.length === 0}
      onClick={() => {
        downloadCsv(filename, toCsv(rows, columns));
        toast.success(`${label} exported`, {
          description: `${rows.length} row${rows.length === 1 ? '' : 's'} written to ${filename}.`,
        });
      }}
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      Export CSV
    </Button>
  );
}

function AdminReportsBody() {
  const [txnFilter, setTxnFilter] = useState('ALL');
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: api.reports,
  });

  const summary = data?.summary;
  const members = data?.members ?? [];
  const books = data?.books ?? [];
  const allTxns = data?.transactions ?? [];

  const transactions = allTxns.filter((txn) => {
    const effective = txn.isOverdue && !txn.returnDate ? 'OVERDUE' : txn.status;
    if (txnFilter === 'ALL') return true;
    if (txnFilter === 'ACTIVE') return !txn.returnDate;
    return effective === txnFilter;
  });

  const cards = summary
    ? [
        { label: 'Titles catalogued', value: String(summary.totalTitles), hint: `${summary.totalCopies} copies held` },
        { label: 'Registered members', value: String(summary.totalMembers), hint: `${summary.pendingMembers} awaiting approval` },
        { label: 'Books on loan', value: String(summary.activeBorrows), hint: `${summary.availableCopies} copies on the shelf` },
        { label: 'Overdue loans', value: String(summary.overdueCount), hint: 'past the 14-day window', danger: summary.overdueCount > 0 },
        { label: 'Fines recorded', value: formatNaira(summary.totalFines), hint: `at ${formatNaira(summary.finePerDay)} per day late` },
      ]
    : [];

  return (
    <Page
      title="Reports"
      description="Library statistics at a glance, plus exportable registers for members, holdings and circulation."
      wide
    >
      {isLoading ? (
        <div className="space-y-8">
          <LoadingCards count={5} />
          <LoadingRows rows={5} />
        </div>
      ) : isError ? (
        <ErrorState message={apiError(error)} onRetry={() => refetch()} />
      ) : (
        <div className="space-y-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {cards.map((card) => (
              <Card key={card.label} className={card.danger ? 'border-destructive/40' : undefined}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    className={`font-display text-3xl font-bold tnum ${card.danger ? 'text-destructive' : ''}`}
                  >
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="circulation">
            <TabsList>
              <TabsTrigger value="circulation">Circulation</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="books">Holdings</TabsTrigger>
            </TabsList>

            {/* Circulation report */}
            <TabsContent value="circulation" className="mt-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl">Borrow, return &amp; overdue report</h2>
                <div className="flex items-center gap-2">
                  <Select value={txnFilter} onValueChange={setTxnFilter}>
                    <SelectTrigger className="w-44" aria-label="Filter report by status">
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
                  <ExportButton
                    rows={transactions}
                    columns={TXN_COLUMNS}
                    filename={`unijos-circulation-${txnFilter.toLowerCase()}.csv`}
                    label="Circulation report"
                  />
                </div>
              </div>

              {transactions.length === 0 ? (
                <EmptyState
                  icon={<FileBarChart className="h-6 w-6" aria-hidden="true" />}
                  title="Nothing to report for this filter"
                  description="Choose a different status, or issue a book from the Circulation page to start building the report."
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell className="font-medium">{txn.bookTitle}</TableCell>
                          <TableCell className="text-sm">{txn.memberName}</TableCell>
                          <TableCell className="tnum text-sm">{formatDate(txn.borrowDate)}</TableCell>
                          <TableCell className="tnum text-sm">{formatDate(txn.dueDate)}</TableCell>
                          <TableCell className="tnum text-sm">{formatDate(txn.returnDate)}</TableCell>
                          <TableCell>
                            <StatusBadge
                              status={txn.isOverdue && !txn.returnDate ? 'OVERDUE' : txn.status}
                            />
                          </TableCell>
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

            {/* Members report */}
            <TabsContent value="members" className="mt-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl">Registered members</h2>
                <ExportButton
                  rows={members}
                  columns={MEMBER_COLUMNS}
                  filename="unijos-members.csv"
                  label="Member register"
                />
              </div>

              {members.length === 0 ? (
                <EmptyState
                  title="No members registered"
                  description="Register readers from the Members page, or approve a self-registration, and they will appear in this register."
                />
              ) : (
                <div className="overflow-x-auto rounded-md border border-border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Matric number</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Registered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <p className="font-medium">{member.fullName}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </TableCell>
                          <TableCell className="tnum text-sm">{member.matricNumber ?? '—'}</TableCell>
                          <TableCell className="text-sm">{member.department ?? '—'}</TableCell>
                          <TableCell className="tnum text-sm">{member.level ?? '—'}</TableCell>
                          <TableCell className="text-xs uppercase tracking-wide text-muted-foreground">
                            {member.role}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={member.status} />
                          </TableCell>
                          <TableCell className="tnum text-sm text-muted-foreground">
                            {formatDate(member.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Holdings report */}
            <TabsContent value="books" className="mt-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl">Holdings &amp; availability</h2>
                <ExportButton
                  rows={books}
                  columns={BOOK_COLUMNS}
                  filename="unijos-holdings.csv"
                  label="Holdings report"
                />
              </div>

              {books.length === 0 ? (
                <EmptyState
                  title="No holdings catalogued"
                  description="Add books from the Books page to build the catalogue and this availability report."
                />
              ) : (
                <div className="overflow-x-auto rounded-md border border-border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title &amp; author</TableHead>
                        <TableHead>Accession</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Available</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {books.map((book) => (
                        <TableRow key={book.id}>
                          <TableCell>
                            <p className="font-medium">{book.title}</p>
                            <p className="text-sm text-muted-foreground">{book.author}</p>
                          </TableCell>
                          <TableCell className="tnum text-sm">{book.accessionNumber}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {book.category ?? '—'}
                          </TableCell>
                          <TableCell className="text-right tnum">{book.totalCopies}</TableCell>
                          <TableCell className="text-right tnum">{book.availableCopies}</TableCell>
                          <TableCell
                            className={`text-right text-sm font-medium ${book.availableCopies > 0 ? 'text-success' : 'text-destructive'}`}
                          >
                            {availabilityLabel(book)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </Page>
  );
}

export default function AdminReports() {
  return (
    <Guard role="ADMIN">
      <AdminReportsBody />
    </Guard>
  );
}