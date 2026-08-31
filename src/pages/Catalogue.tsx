/**
 * Catalogue search and browse for authenticated members, including the borrow
 * action. The Borrow button is disabled with a tooltip explaining exactly why.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Loader2, Search, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EmptyState, ErrorState, Guard, LoadingRows, Page, useSession } from '@/components/shell';
import {
  api,
  apiError,
  availabilityLabel,
  Book,
  borrowBlockedReason,
  formatDate,
} from '@/lib/api';

function BookRow({
  book,
  activeBorrows,
  borrowLimit,
  alreadyBorrowed,
  onBorrow,
  borrowing,
}: {
  book: Book;
  activeBorrows: number;
  borrowLimit: number;
  alreadyBorrowed: boolean;
  onBorrow: (book: Book) => void;
  borrowing: boolean;
}) {
  const { data: session } = useSession();
  const blocked = borrowBlockedReason({
    availableCopies: book.availableCopies,
    activeBorrows,
    borrowLimit,
    alreadyBorrowed,
    memberStatus: session?.member?.status ?? null,
  });
  const available = book.availableCopies > 0;

  const button = (
    <Button
      size="sm"
      disabled={Boolean(blocked) || borrowing}
      onClick={() => onBorrow(book)}
      data-testid={`borrow-${book.id}`}
    >
      {borrowing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          Issuing…
        </>
      ) : (
        'Borrow'
      )}
    </Button>
  );

  return (
    <li className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{book.title}</p>
          {book.category && (
            <Badge variant="outline" className="bg-secondary text-secondary-foreground">
              {book.category}
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {book.author}
          {book.publisher ? ` · ${book.publisher}` : ''}
          {book.publicationYear ? ` · ${book.publicationYear}` : ''}
        </p>
        <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
          Accession {book.accessionNumber}
          {book.isbn ? ` · ISBN ${book.isbn}` : ''}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <span
          className={`w-32 text-sm font-medium tnum ${available ? 'text-success' : 'text-muted-foreground'}`}
        >
          {availabilityLabel(book)}
        </span>
        {blocked ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>{button}</span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              {blocked}
            </TooltipContent>
          </Tooltip>
        ) : (
          button
        )}
      </div>
    </li>
  );
}

function CatalogueBody() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [category, setCategory] = useState('ALL');
  const [availability, setAvailability] = useState('ALL');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['books', submitted, category, availability],
    queryFn: () => api.books({ search: submitted, category, availability }),
  });

  const borrow = useMutation({
    mutationFn: (book: Book) => api.borrow(book.id),
    onSuccess: (result) => {
      toast.success(`"${result.bookTitle}" issued to you`, {
        description: `Due back on ${formatDate(result.dueDate)}. You now have ${result.activeBorrows} of ${session?.config.borrowLimit ?? 3} books on loan.`,
      });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['my-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['session'] });
    },
    onError: (err) => {
      toast.error('Could not issue this book', { description: apiError(err) });
    },
  });

  const books = data?.items ?? [];
  const activeBorrows = data?.activeBorrows ?? session?.activeBorrows ?? 0;
  const borrowLimit = data?.borrowLimit ?? session?.config.borrowLimit ?? 3;
  const openIds = data?.myOpenBookIds ?? [];
  const atLimit = activeBorrows >= borrowLimit;

  return (
    <Page
      title="Catalogue"
      description="Search every holding in the Main Library by title, author, accession number, ISBN, publisher or subject."
      actions={
        <Badge variant="outline" className={atLimit ? 'border-destructive/40 text-destructive' : ''}>
          {activeBorrows} of {borrowLimit} books on loan
        </Badge>
      }
    >
      <form
        className="mb-6 flex flex-col gap-3 lg:flex-row"
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
            placeholder="Search by title, author, accession number, ISBN, publisher or category"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search the catalogue"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-48" aria-label="Filter by category">
              <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              {(data?.categories ?? []).map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={availability} onValueChange={setAvailability}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by availability">
              <SelectValue placeholder="Availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Any availability</SelectItem>
              <SelectItem value="AVAILABLE">Available now</SelectItem>
              <SelectItem value="UNAVAILABLE">All copies out</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </div>
      </form>

      {isLoading ? (
        <LoadingRows rows={6} />
      ) : isError ? (
        <ErrorState message={apiError(error)} onRetry={() => refetch()} />
      ) : books.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" aria-hidden="true" />}
          title="No holdings match this search"
          description={
            submitted || category !== 'ALL' || availability !== 'ALL'
              ? 'Try a shorter search term, or clear the category and availability filters to see the full catalogue.'
              : 'The catalogue is empty. A librarian needs to add holdings before anything can be borrowed.'
          }
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                setSubmitted('');
                setCategory('ALL');
                setAvailability('ALL');
              }}
            >
              Clear search and filters
            </Button>
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {data?.total ?? books.length} holding{(data?.total ?? books.length) === 1 ? '' : 's'} found
          </p>
          <ul className="divide-y divide-border rounded-md border border-border bg-card">
            {books.map((book) => (
              <BookRow
                key={book.id}
                book={book}
                activeBorrows={activeBorrows}
                borrowLimit={borrowLimit}
                alreadyBorrowed={openIds.includes(book.id)}
                onBorrow={(item) => borrow.mutate(item)}
                borrowing={borrow.isPending && borrow.variables?.id === book.id}
              />
            ))}
          </ul>
          {atLimit && (
            <p className="mt-4 text-sm text-muted-foreground">
              You are holding the maximum of {borrowLimit} books.{' '}
              <Link to="/my-books" className="font-medium text-primary underline-offset-4 hover:underline">
                Return one
              </Link>{' '}
              to borrow again.
            </p>
          )}
        </>
      )}
    </Page>
  );
}

export default function Catalogue() {
  return (
    <Guard role="USER">
      <CatalogueBody />
    </Guard>
  );
}