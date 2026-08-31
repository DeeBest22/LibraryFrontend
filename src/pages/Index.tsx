/** Public landing page (Guest). Distinct from /login and /register. */
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarClock, Library, Search, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer, Header, useSession } from '@/components/shell';

const CAPABILITIES = [
  {
    icon: Search,
    title: 'Search the whole catalogue',
    body: 'Look up any holding by title, author, accession number, ISBN, publisher or subject — and see live copy availability before you walk to the shelf.',
  },
  {
    icon: CalendarClock,
    title: 'Borrow and return in seconds',
    body: 'Up to three books at a time, with a 14-day loan window, automatic due dates and a running days-remaining count on every loan.',
  },
  {
    icon: Users,
    title: 'Membership that stays current',
    body: 'Students and staff register once against their matriculation record; librarians approve, update or deactivate accounts from one desk.',
  },
  {
    icon: ShieldCheck,
    title: 'Accountable circulation',
    body: 'Every issue and return is written to a permanent transaction record, with overdue flags and fines calculated the moment a book comes back.',
  },
];

export default function Index() {
  const { data: session } = useSession();
  const member = session?.member;
  const homeFor = member?.role === 'ADMIN' ? '/admin/reports' : '/dashboard';

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero — asymmetric 3/2 split, single dominant idea */}
        <section className="border-b border-border bg-secondary/40">
          <div className="mx-auto grid max-w-screen-xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-5 lg:gap-16 lg:px-8 lg:py-24">
            <div className="lg:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                University of Jos · Main Library
              </p>
              <h1 className="mt-4 font-display text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">
                The accession register,
                <br />
                now open all night.
              </h1>
              <p className="mt-6 max-w-prose text-base leading-relaxed text-muted-foreground">
                Cataloguing, circulation, membership and reporting for the University of Jos library —
                one record for every book, one account for every reader, no paper logbooks.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {member ? (
                  <Button size="lg" asChild className="gap-2">
                    <Link to={homeFor}>
                      Go to my area
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button size="lg" asChild className="gap-2">
                      <Link to="/register">
                        Register as a member
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                      <Link to="/login">Login</Link>
                    </Button>
                  </>
                )}
              </div>
              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-border pt-6">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Loan period</dt>
                  <dd className="mt-1 font-display text-2xl font-bold tnum">14 days</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Books at once</dt>
                  <dd className="mt-1 font-display text-2xl font-bold tnum">3</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Late fine</dt>
                  <dd className="mt-1 font-display text-2xl font-bold tnum">₦50/day</dd>
                </div>
              </dl>
            </div>

            <div className="lg:col-span-2">
              <div className="h-full rounded-lg border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-primary">
                  <Library className="h-5 w-5" aria-hidden="true" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider">Who uses it</h2>
                </div>
                <ul className="mt-5 divide-y divide-border text-sm">
                  <li className="py-4">
                    <p className="font-semibold">Students &amp; staff</p>
                    <p className="mt-1 text-muted-foreground">
                      Search holdings, borrow up to three titles, track due dates and see your full
                      borrowing history.
                    </p>
                  </li>
                  <li className="py-4">
                    <p className="font-semibold">Librarians</p>
                    <p className="mt-1 text-muted-foreground">
                      Catalogue new accessions, approve registrations, issue and receive books on behalf
                      of readers, and export reports.
                    </p>
                  </li>
                  <li className="pt-4">
                    <p className="font-semibold">Visitors</p>
                    <p className="mt-1 text-muted-foreground">
                      Browse this page and the about page. Borrowing requires an approved membership.
                    </p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities — varied two-column rows, not identical cards */}
        <section className="mx-auto max-w-screen-xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl">What the system does</h2>
          <div className="mt-8 grid gap-x-12 gap-y-10 sm:grid-cols-2">
            {CAPABILITIES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h3 className="text-base font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-primary text-primary-foreground">
          <div className="mx-auto flex max-w-screen-xl flex-col gap-5 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <div>
              <h2 className="font-display text-2xl font-bold">Ready to borrow?</h2>
              <p className="mt-2 max-w-prose text-sm text-primary-foreground/80">
                Register with your matriculation number. A librarian approves new members from the
                circulation desk, usually the same working day.
              </p>
            </div>
            <Button size="lg" variant="secondary" asChild className="shrink-0 gap-2">
              <Link to="/register">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                Start registration
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}