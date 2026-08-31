/**
 * Frontend tests: borrow-button disabled logic and registration form validation.
 *
 *   cd app/frontend && pnpm test
 */
import { describe, expect, it } from 'vitest';
import {
  availabilityLabel,
  borrowBlockedReason,
  bookSchema,
  dueLabel,
  formatNaira,
  memberSchema,
  registrationSchema,
  toCsv,
  Transaction,
} from './api';

describe('borrowBlockedReason — Borrow button disabled logic', () => {
  const base = { availableCopies: 3, activeBorrows: 0, borrowLimit: 3 } as const;

  it('allows borrowing when a copy is free and the member is under the limit', () => {
    expect(borrowBlockedReason({ ...base, memberStatus: 'ACTIVE' })).toBeNull();
  });

  it('blocks when every copy is on loan', () => {
    const reason = borrowBlockedReason({ ...base, availableCopies: 0, memberStatus: 'ACTIVE' });
    expect(reason).toMatch(/currently on loan/i);
  });

  it('blocks at exactly the 3-book limit', () => {
    const reason = borrowBlockedReason({ ...base, activeBorrows: 3, memberStatus: 'ACTIVE' });
    expect(reason).toMatch(/Borrow limit reached/i);
    expect(reason).toContain('max 3');
  });

  it('still blocks above the limit', () => {
    expect(borrowBlockedReason({ ...base, activeBorrows: 4, memberStatus: 'ACTIVE' })).not.toBeNull();
  });

  it('allows borrowing at one below the limit', () => {
    expect(borrowBlockedReason({ ...base, activeBorrows: 2, memberStatus: 'ACTIVE' })).toBeNull();
  });

  it('blocks a duplicate loan of the same title', () => {
    const reason = borrowBlockedReason({ ...base, alreadyBorrowed: true, memberStatus: 'ACTIVE' });
    expect(reason).toMatch(/already have a copy/i);
  });

  it('blocks a member awaiting approval before any other check', () => {
    const reason = borrowBlockedReason({
      ...base,
      availableCopies: 0,
      activeBorrows: 5,
      memberStatus: 'PENDING_APPROVAL',
    });
    expect(reason).toMatch(/awaiting librarian approval/i);
  });

  it('blocks a deactivated member', () => {
    expect(borrowBlockedReason({ ...base, memberStatus: 'INACTIVE' })).toMatch(/inactive/i);
  });
});

describe('registrationSchema — self-registration validation', () => {
  const valid = {
    firstName: 'Grace',
    lastName: 'Dung',
    matricNumber: 'UJ/2021/CSC/1042',
    department: 'Computer Science',
    level: '300',
  };

  it('accepts a complete, well-formed registration', () => {
    expect(registrationSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a matriculation number in the wrong format', () => {
    const result = registrationSchema.safeParse({ ...valid, matricNumber: '20211042' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/UJ\/2021\/CSC\/1042/);
    }
  });

  it('rejects an empty matriculation number', () => {
    expect(registrationSchema.safeParse({ ...valid, matricNumber: '' }).success).toBe(false);
  });

  it('rejects a one-character first name', () => {
    const result = registrationSchema.safeParse({ ...valid, firstName: 'G' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing department', () => {
    expect(registrationSchema.safeParse({ ...valid, department: '' }).success).toBe(false);
  });

  it('rejects a missing level', () => {
    expect(registrationSchema.safeParse({ ...valid, level: '' }).success).toBe(false);
  });

  it('trims surrounding whitespace', () => {
    const result = registrationSchema.safeParse({ ...valid, firstName: '  Grace  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.firstName).toBe('Grace');
  });

  it('reports every invalid field at once', () => {
    const result = registrationSchema.safeParse({
      firstName: '',
      lastName: '',
      matricNumber: 'nope',
      department: '',
      level: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.length).toBeGreaterThanOrEqual(5);
  });
});

describe('bookSchema — catalogue form validation', () => {
  const valid = {
    title: 'Introduction to Algorithms',
    author: 'Thomas H. Cormen',
    accessionNumber: 'UJ-CSC-0001',
    isbn: '9780262046305',
    publisher: 'MIT Press',
    publicationYear: 2022,
    category: 'Computer Science',
    totalCopies: 5,
  };

  it('accepts a fully populated book record', () => {
    expect(bookSchema.safeParse(valid).success).toBe(true);
  });

  it('requires at least one copy', () => {
    expect(bookSchema.safeParse({ ...valid, totalCopies: 0 }).success).toBe(false);
  });

  it('coerces numeric strings from the form inputs', () => {
    const result = bookSchema.safeParse({ ...valid, totalCopies: '4', publicationYear: '1999' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalCopies).toBe(4);
      expect(result.data.publicationYear).toBe(1999);
    }
  });

  it('rejects an implausible publication year', () => {
    expect(bookSchema.safeParse({ ...valid, publicationYear: 1200 }).success).toBe(false);
  });

  it('requires an accession number', () => {
    expect(bookSchema.safeParse({ ...valid, accessionNumber: '' }).success).toBe(false);
  });
});

describe('memberSchema — admin direct registration', () => {
  const valid = {
    firstName: 'Ladi',
    lastName: 'Pwajok',
    email: 'ladi@unijos.edu.ng',
    matricNumber: '',
    department: 'University Library',
    level: 'Staff',
    role: 'ADMIN' as const,
  };

  it('allows staff without a matriculation number', () => {
    expect(memberSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an invalid e-mail address', () => {
    expect(memberSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('validates the matriculation format when one is supplied', () => {
    expect(memberSchema.safeParse({ ...valid, matricNumber: '123' }).success).toBe(false);
    expect(
      memberSchema.safeParse({ ...valid, matricNumber: 'UJ/2022/MED/0771' }).success,
    ).toBe(true);
  });
});

describe('display helpers', () => {
  it('reports live availability per book', () => {
    expect(availabilityLabel({ availableCopies: 2, totalCopies: 5 })).toBe('2 of 5 copies');
    expect(availabilityLabel({ availableCopies: 0, totalCopies: 5 })).toBe('Unavailable');
  });

  it('formats fines in naira', () => {
    expect(formatNaira(200)).toBe('₦200.00');
    expect(formatNaira(0)).toBe('₦0.00');
  });

  it('describes days remaining and overdue loans', () => {
    const txn = (overrides: Partial<Transaction>): Transaction =>
      ({
        id: 1,
        memberId: 1,
        bookId: 1,
        borrowDate: '2026-08-01T00:00:00Z',
        dueDate: '2026-08-15T00:00:00Z',
        returnDate: null,
        status: 'BORROWED',
        fineAmount: 0,
        daysRemaining: 5,
        isOverdue: false,
        ...overrides,
      }) as Transaction;

    expect(dueLabel(txn({ daysRemaining: 5 }))).toBe('5 days remaining');
    expect(dueLabel(txn({ daysRemaining: 1 }))).toBe('1 day remaining');
    expect(dueLabel(txn({ daysRemaining: 0 }))).toBe('Due today');
    expect(dueLabel(txn({ daysRemaining: -3, isOverdue: true }))).toBe('3 days overdue');
    expect(dueLabel(txn({ returnDate: '2026-08-14T00:00:00Z' }))).toMatch(/^Returned/);
  });

  it('escapes CSV values containing commas and quotes', () => {
    const csv = toCsv([{ title: 'Algorithms, 4th ed.', note: 'He said "hello"' }], [
      { header: 'Title', value: (r) => r.title },
      { header: 'Note', value: (r) => r.note },
    ]);
    expect(csv).toBe('Title,Note\n"Algorithms, 4th ed.","He said ""hello"""');
  });
}); 