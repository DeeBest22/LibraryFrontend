/** Public About page (Guest accessible). */
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Page } from '@/components/shell';

const RULES = [
  ['Loan period', '14 days from the date of issue, calculated automatically.'],
  ['Concurrent loans', 'A maximum of three books may be held at any one time.'],
  ['Overdue fine', '₦50 for each day a book is kept past its due date.'],
  ['Renewals', 'Return the book at the desk and borrow it again if no one is waiting.'],
];

export default function About() {
  return (
    <Page
      title="About the library system"
      description="Why the University of Jos replaced its paper accession registers with this platform, and how circulation now works."
    >
      <div className="grid gap-12 lg:grid-cols-5">
        <div className="space-y-8 lg:col-span-3">
          <section className="space-y-4">
            <h2 className="font-display text-2xl">From logbooks to live records</h2>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              For years the Main Library on the Bauchi Road campus ran on paper: an accession register
              for holdings, borrower cards for circulation and a notice board for overdue lists. Files
              went missing, a single title took minutes to trace, and no one could say with confidence
              how many copies of a text were actually on the shelf.
            </p>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              This system replaces all of that with one database. Every holding has a permanent record
              with its accession number and copy count. Every issue and return writes a transaction that
              cannot be lost or quietly edited, and availability is recalculated the moment a book moves.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-2xl">How borrowing works</h2>
            <ol className="max-w-prose space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">1.</span>
                Register once with your matriculation number, department and level. A librarian reviews
                and approves the request.
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">2.</span>
                Search the catalogue and borrow any title with a free copy — the system refuses the loan
                if the last copy is already out or you are holding three books.
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">3.</span>
                Watch your due dates on the My Books page. Overdue loans are flagged in red.
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">4.</span>
                Record the return yourself or at the desk. If the book is late, the fine is worked out
                and stored on the loan record.
              </li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-2xl">What it does not do</h2>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              There is no barcode or RFID hardware, no holds and reservations, no e-mail or SMS alerts,
              no mobile app and no link to the student information system. Circulation still happens at
              the desk — this platform is the record, not the turnstile.
            </p>
          </section>
        </div>

        <aside className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
              Circulation rules
            </h2>
            <dl className="mt-5 divide-y divide-border text-sm">
              {RULES.map(([term, detail]) => (
                <div key={term} className="py-3.5">
                  <dt className="font-semibold">{term}</dt>
                  <dd className="mt-1 text-muted-foreground">{detail}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 space-y-3 border-t border-border pt-6">
              <p className="text-sm text-muted-foreground">
                Main Library, Bauchi Road Campus, University of Jos, Plateau State. Open Monday to
                Friday, 8:00 to 18:00.
              </p>
              <Button asChild className="w-full">
                <Link to="/register">Register as a member</Link>
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </Page>
  );
}