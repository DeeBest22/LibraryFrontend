/**
 * API layer, domain types, Zod schemas and pure business helpers.
 *
 * Every network call goes through a plain axios client against the
 * `/api/v1/library/*` and `/api/v1/auth/*` routes implemented in
 * LibraryBackend. The backend is the single source of truth for roles,
 * limits and fines - the helpers below only mirror server rules to keep the
 * UI honest.
 */
import axios from 'axios';
import { z } from 'zod';
import { getAPIBaseURL } from './config';
import { authApi, getToken, clearToken } from './auth';

const http = axios.create({ withCredentials: false });

/** Thin shim so existing call sites (`client.auth.toLogin()` etc.) keep working
 *  while actually hitting the real backend instead of a platform-only SDK. */
export const client = {
  auth: {
    toLogin: () => authApi.login(),
    login: () => authApi.login(),
    logout: () => authApi.logout(),
    me: () => authApi.getCurrentUser(),
  },
};

/* ------------------------------------------------------------------ types */

export type Role = 'ADMIN' | 'USER';
export type MemberStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING_APPROVAL';
export type TxnStatus = 'BORROWED' | 'RETURNED' | 'OVERDUE';

export interface Member {
  id: number;
  email: string;
  username?: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  matricNumber?: string | null;
  department?: string | null;
  level?: string | null;
  role: Role;
  status: MemberStatus;
  linked: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  accessionNumber: string;
  isbn?: string | null;
  publisher?: string | null;
  publicationYear?: number | null;
  category?: string | null;
  totalCopies: number;
  availableCopies: number;
  coverImageUrl?: string | null;
}

export interface Transaction {
  id: number;
  memberId: number;
  bookId: number;
  borrowDate: string | null;
  dueDate: string | null;
  returnDate: string | null;
  status: TxnStatus;
  fineAmount: number;
  daysRemaining: number | null;
  isOverdue: boolean;
  bookTitle?: string;
  bookAuthor?: string;
  accessionNumber?: string;
  category?: string | null;
  memberName?: string;
  memberEmail?: string;
  matricNumber?: string | null;
}

export interface LibraryConfig {
  loanPeriodDays: number;
  finePerDay: number;
  borrowLimit: number;
}

export interface Session {
  authenticated: boolean;
  member: Member | null;
  needsRegistration: boolean;
  activeBorrows: number;
  config: LibraryConfig;
  account?: { email?: string | null; name?: string | null };
}

export interface ReportSummary {
  totalTitles: number;
  totalCopies: number;
  availableCopies: number;
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  inactiveMembers: number;
  activeBorrows: number;
  overdueCount: number;
  totalFines: number;
  loanPeriodDays: number;
  finePerDay: number;
  borrowLimit: number;
}

export const DEFAULT_CONFIG: LibraryConfig = {
  loanPeriodDays: 14,
  finePerDay: 50,
  borrowLimit: 3,
};

/* ------------------------------------------------------------ error shape */

interface ErrorBody {
  error?: { message?: string; code?: string; details?: unknown };
  detail?: unknown;
  message?: string;
}

function bodies(e: unknown): ErrorBody[] {
  const raw = e as { data?: ErrorBody; response?: { data?: ErrorBody } };
  return [raw?.data, raw?.response?.data].filter(Boolean) as ErrorBody[];
}

/** Extract a human readable message from the API's `{ error: { ... } }` shape. */
export function apiError(e: unknown, fallback = 'Request failed. Please try again.'): string {
  for (const body of bodies(e)) {
    if (body.error?.message) return body.error.message;
    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail) && body.detail.length) {
      const first = body.detail[0] as { msg?: string };
      if (first?.msg) return first.msg;
    }
    if (body.message) return body.message;
  }
  const msg = (e as { message?: string })?.message;
  return msg && !/status code/i.test(msg) ? msg : fallback;
}

/** Machine readable error code, used to branch on membership states. */
export function apiErrorCode(e: unknown): string {
  for (const body of bodies(e)) {
    if (body.error?.code) return body.error.code;
  }
  return 'UNKNOWN';
}

/* --------------------------------------------------------------- requests */

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

const UNAUTHENTICATED_SESSION: Session = {
  authenticated: false,
  member: null,
  needsRegistration: false,
  activeBorrows: 0,
  config: DEFAULT_CONFIG,
};

async function request<T>(url: string, method: Method, data: unknown = {}): Promise<T> {
  const token = getToken();
  const response = await http.request<T>({
    baseURL: getAPIBaseURL(),
    url,
    method,
    params: method === 'GET' ? data : undefined,
    data: method === 'GET' ? undefined : data,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return response.data;
}

export const api = {
  session: async (): Promise<Session> => {
    if (!getToken()) return UNAUTHENTICATED_SESSION;
    try {
      return await request<Session>('/api/v1/library/session', 'GET');
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        clearToken();
        return UNAUTHENTICATED_SESSION;
      }
      throw e;
    }
  },

  selfRegister: (data: RegistrationInput) =>
    request<{ member: Member; message: string }>('/api/v1/library/register', 'POST', {
      first_name: data.firstName,
      last_name: data.lastName,
      matric_number: data.matricNumber,
      department: data.department,
      level: data.level,
    }),

  books: (params: { search?: string; category?: string; availability?: string }) =>
    request<{
      items: Book[];
      total: number;
      categories: string[];
      activeBorrows?: number;
      borrowLimit?: number;
      myOpenBookIds?: number[];
    }>('/api/v1/library/books', 'GET', {
      search: params.search || undefined,
      category: params.category && params.category !== 'ALL' ? params.category : undefined,
      availability:
        params.availability && params.availability !== 'ALL' ? params.availability : undefined,
      limit: 200,
    }),

  createBook: (data: BookInput) =>
    request<Book>('/api/v1/library/admin/books', 'POST', toBookPayload(data)),

  updateBook: (id: number, data: BookInput) =>
    request<Book>(`/api/v1/library/admin/books/${id}`, 'PUT', toBookPayload(data)),

  deleteBook: (id: number) =>
    request<{ deleted: number }>(`/api/v1/library/admin/books/${id}`, 'DELETE'),

  members: (params: { status?: string; search?: string }) =>
    request<{ items: Member[]; counts: Record<string, number> }>(
      '/api/v1/library/admin/members',
      'GET',
      { status: params.status || undefined, search: params.search || undefined },
    ),

  createMember: (data: MemberInput) =>
    request<{ member: Member }>('/api/v1/library/admin/members', 'POST', {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      matric_number: data.matricNumber || undefined,
      department: data.department || undefined,
      level: data.level || undefined,
      role: data.role,
    }),

  updateMember: (id: number, data: Record<string, unknown>) =>
    request<{ member: Member }>(`/api/v1/library/admin/members/${id}`, 'PUT', data),

  deleteMember: (id: number) =>
    request<{ deleted: number }>(`/api/v1/library/admin/members/${id}`, 'DELETE'),

  borrow: (bookId: number, memberId?: number) =>
    request<{
      transactionId: number;
      bookTitle: string;
      dueDate: string;
      availableCopies: number;
      activeBorrows: number;
    }>('/api/v1/library/borrow', 'POST', { book_id: bookId, member_id: memberId ?? null }),

  return: (transactionId: number) =>
    request<{
      transactionId: number;
      bookTitle: string;
      daysLate: number;
      fineAmount: number;
    }>('/api/v1/library/return', 'POST', { transaction_id: transactionId }),

  myTransactions: () =>
    request<{
      items: Transaction[];
      stats: {
        activeBorrows: number;
        borrowLimit: number;
        dueSoon: number;
        overdue: number;
        totalFines: number;
        totalBorrowed: number;
      };
    }>('/api/v1/library/my-transactions', 'GET'),

  transactions: (params: { status?: string; search?: string }) =>
    request<{ items: Transaction[] }>('/api/v1/library/admin/transactions', 'GET', {
      status: params.status && params.status !== 'ALL' ? params.status : undefined,
      search: params.search || undefined,
    }),

  reports: () =>
    request<{
      summary: ReportSummary;
      members: Member[];
      books: Book[];
      transactions: Transaction[];
    }>('/api/v1/library/admin/reports', 'GET'),
};

/* ---------------------------------------------------------- zod contracts */

/** University of Jos matriculation format, e.g. UJ/2021/CSC/1042. */
export const MATRIC_PATTERN = /^UJ\/\d{4}\/[A-Z]{2,5}\/\d{3,5}$/i;

export const registrationSchema = z.object({
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters'),
  matricNumber: z
    .string()
    .trim()
    .regex(MATRIC_PATTERN, 'Use the format UJ/2021/CSC/1042'),
  department: z.string().trim().min(2, 'Select or enter your department'),
  level: z.string().trim().min(3, 'Select your level'),
});
export type RegistrationInput = z.infer<typeof registrationSchema>;

export const bookSchema = z.object({
  title: z.string().trim().min(2, 'Title is required'),
  author: z.string().trim().min(2, 'Author is required'),
  accessionNumber: z.string().trim().min(2, 'Accession number is required'),
  isbn: z.string().trim().max(40).optional().or(z.literal('')),
  publisher: z.string().trim().max(200).optional().or(z.literal('')),
  publicationYear: z.coerce
    .number({ invalid_type_error: 'Enter a valid year' })
    .int()
    .min(1400, 'Year looks too early')
    .max(2100, 'Year looks too far ahead'),
  category: z.string().trim().min(2, 'Category is required'),
  totalCopies: z.coerce
    .number({ invalid_type_error: 'Enter a number' })
    .int()
    .min(1, 'At least one copy is required')
    .max(10000, 'That is a lot of copies'),
});
export type BookInput = z.infer<typeof bookSchema>;

function toBookPayload(data: BookInput) {
  return {
    title: data.title,
    author: data.author,
    accession_number: data.accessionNumber,
    isbn: data.isbn || undefined,
    publisher: data.publisher || undefined,
    publication_year: data.publicationYear,
    category: data.category,
    total_copies: data.totalCopies,
  };
}

export const memberSchema = z.object({
  firstName: z.string().trim().min(2, 'First name is required'),
  lastName: z.string().trim().min(2, 'Last name is required'),
  email: z.string().trim().email('Enter a valid e-mail address'),
  matricNumber: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || MATRIC_PATTERN.test(v), 'Use the format UJ/2021/CSC/1042'),
  department: z.string().trim().min(2, 'Department is required'),
  level: z.string().trim().optional().or(z.literal('')),
  role: z.enum(['USER', 'ADMIN']),
});
export type MemberInput = z.infer<typeof memberSchema>;

/* ------------------------------------------------------- pure UI helpers */

export interface BorrowGateInput {
  availableCopies: number;
  activeBorrows: number;
  borrowLimit: number;
  alreadyBorrowed?: boolean;
  memberStatus?: MemberStatus | null;
}

/**
 * Mirror of the backend borrow rules, used to disable the Borrow button and
 * explain *why* it is disabled. Returns `null` when borrowing is allowed.
 */
export function borrowBlockedReason(input: BorrowGateInput): string | null {
  const { availableCopies, activeBorrows, borrowLimit, alreadyBorrowed, memberStatus } = input;
  if (memberStatus === 'PENDING_APPROVAL') {
    return 'Your membership is awaiting librarian approval.';
  }
  if (memberStatus === 'INACTIVE') {
    return 'Your membership is inactive. Contact the library desk.';
  }
  if (alreadyBorrowed) {
    return 'You already have a copy of this title on loan.';
  }
  if (availableCopies <= 0) {
    return 'All copies of this title are currently on loan.';
  }
  if (activeBorrows >= borrowLimit) {
    return `Borrow limit reached — return a book to free a slot (max ${borrowLimit}).`;
  }
  return null;
}

export function availabilityLabel(book: Pick<Book, 'availableCopies' | 'totalCopies'>): string {
  if (book.availableCopies <= 0) return 'Unavailable';
  return `${book.availableCopies} of ${book.totalCopies} copies`;
}

export function formatNaira(amount: number): string {
  return `₦${(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function dueLabel(txn: Transaction): string {
  if (txn.returnDate) return `Returned ${formatDate(txn.returnDate)}`;
  const days = txn.daysRemaining;
  if (days === null) return 'No due date';
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  return `${days} day${days === 1 ? '' : 's'} remaining`;
}

/* --------------------------------------------------------------- CSV export */

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const escape = (raw: string | number | null | undefined) => {
    const text = raw === null || raw === undefined ? '' : String(raw);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const head = columns.map((c) => escape(c.header)).join(',');
  const body = rows.map((row) => columns.map((c) => escape(c.value(row))).join(','));
  return [head, ...body].join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------- registration draft store */

const DRAFT_KEY = 'unijos-lms-registration-draft';

export function saveRegistrationDraft(data: RegistrationInput): void {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
}

export function readRegistrationDraft(): RegistrationInput | null {
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  const parsed = registrationSchema.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data : null;
}

export function clearRegistrationDraft(): void {
  sessionStorage.removeItem(DRAFT_KEY);
}

export const DEPARTMENTS = [
  'Computer Science',
  'Law',
  'Medicine',
  'Economics',
  'Education',
  'History',
  'Pure Sciences',
  'Management',
  'English',
  'University Library',
];

export const LEVELS = ['100', '200', '300', '400', '500', 'Postgraduate', 'Staff'];