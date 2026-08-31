/** Unknown route fallback. */
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, Page } from '@/components/shell';

export default function NotFound() {
  return (
    <Page>
      <div className="mx-auto max-w-md py-12">
        <EmptyState
          icon={<Compass className="h-6 w-6" aria-hidden="true" />}
          title="That page isn't in the catalogue"
          description="The link may be out of date. Head back to the library home page or search the catalogue instead."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to="/">Library home</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/catalogue">Search the catalogue</Link>
              </Button>
            </div>
          }
        />
      </div>
    </Page>
  );
}