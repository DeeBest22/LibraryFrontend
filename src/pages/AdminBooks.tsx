/** Admin: full CRUD over the catalogue. availableCopies is read-only/derived. */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookPlus, Loader2, Pencil, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { EmptyState, ErrorState, Guard, LoadingRows, Page } from '@/components/shell';
import { api, apiError, availabilityLabel, Book, BookInput, bookSchema } from '@/lib/api';

const EMPTY: BookInput = {
  title: '',
  author: '',
  accessionNumber: '',
  isbn: '',
  publisher: '',
  publicationYear: new Date().getFullYear(),
  category: '',
  totalCopies: 1,
};

function BookForm({
  open,
  book,
  onClose,
}: {
  open: boolean;
  book: Book | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const onLoan = book ? book.totalCopies - book.availableCopies : 0;

  const form = useForm<BookInput>({
    resolver: zodResolver(bookSchema),
    mode: 'onBlur',
    values: book
      ? {
          title: book.title,
          author: book.author,
          accessionNumber: book.accessionNumber,
          isbn: book.isbn ?? '',
          publisher: book.publisher ?? '',
          publicationYear: book.publicationYear ?? new Date().getFullYear(),
          category: book.category ?? '',
          totalCopies: book.totalCopies,
        }
      : EMPTY,
  });

  const save = useMutation({
    mutationFn: (values: BookInput) =>
      book ? api.updateBook(book.id, values) : api.createBook(values),
    onSuccess: (saved) => {
      toast.success(book ? 'Book record updated' : 'Book added to the catalogue', {
        description: `${saved.title} · accession ${saved.accessionNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      onClose();
    },
    onError: (error) => {
      toast.error(book ? 'Could not update the book' : 'Could not add the book', {
        description: apiError(error),
      });
    },
  });

  const errors = form.formState.errors;
  const totalCopies = Number(form.watch('totalCopies')) || 0;
  const derivedAvailable = Math.max(0, totalCopies - onLoan);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {book ? 'Edit book record' : 'Add a book'}
          </DialogTitle>
          <DialogDescription>
            Every catalogue field is captured here. Available copies is calculated from total copies
            minus the copies currently on loan.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={form.handleSubmit((v) => save.mutate(v))} noValidate>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...form.register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input id="author" {...form.register('author')} />
              {errors.author && <p className="text-sm text-destructive">{errors.author.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessionNumber">Accession number</Label>
              <Input id="accessionNumber" placeholder="UJ-CSC-0001" {...form.register('accessionNumber')} />
              {errors.accessionNumber && (
                <p className="text-sm text-destructive">{errors.accessionNumber.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="isbn">ISBN</Label>
              <Input id="isbn" placeholder="9780262046305" {...form.register('isbn')} />
              {errors.isbn && <p className="text-sm text-destructive">{errors.isbn.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="publisher">Publisher</Label>
              <Input id="publisher" {...form.register('publisher')} />
              {errors.publisher && (
                <p className="text-sm text-destructive">{errors.publisher.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="publicationYear">Publication year</Label>
              <Input id="publicationYear" type="number" {...form.register('publicationYear')} />
              {errors.publicationYear && (
                <p className="text-sm text-destructive">{errors.publicationYear.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" placeholder="Computer Science" {...form.register('category')} />
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalCopies">Total copies</Label>
              <Input id="totalCopies" type="number" min={1} {...form.register('totalCopies')} />
              {errors.totalCopies && (
                <p className="text-sm text-destructive">{errors.totalCopies.message}</p>
              )}
            </div>
          </div>

          <div className="rounded-md border border-border bg-secondary/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Available copies (calculated)</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  {onLoan} cop{onLoan === 1 ? 'y' : 'ies'} currently on loan
                </p>
              </div>
              <Input
                readOnly
                disabled
                value={derivedAvailable}
                className="w-20 text-center tnum"
                aria-label="Available copies"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : book ? (
                'Save changes'
              ) : (
                'Add book'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdminBooksBody() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [category, setCategory] = useState('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [deleting, setDeleting] = useState<Book | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-books', submitted, category],
    queryFn: () => api.books({ search: submitted, category }),
  });

  const remove = useMutation({
    mutationFn: (book: Book) => api.deleteBook(book.id),
    onSuccess: (_result, book) => {
      toast.success('Book removed from the catalogue', { description: book.title });
      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
      setDeleting(null);
    },
    onError: (err) => {
      toast.error('Could not delete this book', { description: apiError(err) });
      setDeleting(null);
    },
  });

  const books = data?.items ?? [];

  return (
    <Page
      title="Books"
      description="Catalogue every holding in the Main Library, keep copy counts accurate and retire records that are no longer on the shelf."
      wide
      actions={
        <Button
          className="gap-2"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <BookPlus className="h-4 w-4" aria-hidden="true" />
          Add book
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
            placeholder="Search by title, author, accession number, ISBN, publisher or category"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search books"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-52" aria-label="Filter by category">
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
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {isLoading ? (
        <LoadingRows rows={6} />
      ) : isError ? (
        <ErrorState message={apiError(error)} onRetry={() => refetch()} />
      ) : books.length === 0 ? (
        <EmptyState
          icon={<BookPlus className="h-6 w-6" aria-hidden="true" />}
          title={submitted || category !== 'ALL' ? 'No books match this search' : 'The catalogue is empty'}
          description={
            submitted || category !== 'ALL'
              ? 'Adjust the search term or clear the category filter to see all holdings.'
              : 'Add the first accession record so members have something to borrow.'
          }
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add the first book
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title &amp; author</TableHead>
                <TableHead>Accession / ISBN</TableHead>
                <TableHead>Publisher</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Availability</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.map((book) => (
                <TableRow key={book.id}>
                  <TableCell>
                    <p className="font-medium">{book.title}</p>
                    <p className="text-sm text-muted-foreground">{book.author}</p>
                  </TableCell>
                  <TableCell>
                    <p className="tnum text-sm">{book.accessionNumber}</p>
                    {book.isbn && <p className="tnum text-xs text-muted-foreground">{book.isbn}</p>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {book.publisher ?? '—'}
                    {book.publicationYear ? ` · ${book.publicationYear}` : ''}
                  </TableCell>
                  <TableCell>
                    {book.category ? (
                      <Badge variant="outline" className="bg-secondary text-secondary-foreground">
                        {book.category}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`text-sm font-medium tnum ${book.availableCopies > 0 ? 'text-success' : 'text-destructive'}`}
                    >
                      {availabilityLabel(book)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${book.title}`}
                        onClick={() => {
                          setEditing(book);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${book.title}`}
                        onClick={() => setDeleting(book)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {formOpen && (
        <BookForm
          open={formOpen}
          book={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this book record?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.title}" (accession {deleting?.accessionNumber}) will be removed from the
              catalogue. Records with copies still on loan cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep book</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                if (deleting) remove.mutate(deleting);
              }}
            >
              Delete book
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}

export default function AdminBooks() {
  return (
    <Guard role="ADMIN">
      <AdminBooksBody />
    </Guard>
  );
}