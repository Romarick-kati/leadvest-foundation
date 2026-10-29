import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { AlertTriangle, Compass, RotateCcw } from '../../components/ui/icons';
import { StatusPage } from '../../components/ui/StatusPage';
import { buttonClass } from '../../components/ui/Button';

/**
 * Shown if a page fails to load (for example after a new deployment changed file names).
 * Rendered outside the layout and router links, so it only uses plain anchors.
 */
export function RouteError() {
  const err = useRouteError();
  const notFound = isRouteErrorResponse(err) && err.status === 404;
  return (
    <main id="main" className="flex min-h-dvh flex-col justify-center bg-surface">
      <StatusPage
        icon={notFound ? Compass : AlertTriangle}
        title={notFound ? 'Page not found' : 'Something went wrong'}
        actions={
          <>
            <button type="button" onClick={() => window.location.reload()} className={buttonClass('primary', 'md')}>
              <RotateCcw size={14} /> Refresh
            </button>
            <a href="/" className={buttonClass('secondary', 'md')}>Go to the homepage</a>
          </>
        }
      >
        {notFound ? 'That page does not exist.' : 'Please refresh the page. If the problem continues, try again later.'}
      </StatusPage>
    </main>
  );
}
