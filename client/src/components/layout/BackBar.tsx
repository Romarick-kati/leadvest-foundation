import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft } from '../ui/icons';
import { useT } from '../../i18n';

/**
 * Back control shown under the header on every public page except the home page. Goes to the
 * previous page the visitor came from; if they arrived straight on this page (a shared link,
 * for example) it goes to the home page instead, so it never throws them off the site by accident.
 * The browser's own back and forward buttons work as normal too.
 */
export function BackBar() {
  const t = useT();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (pathname === '/') return null;
  const canGoBack = (window.history.state?.idx ?? 0) > 0;
  return (
    <div className="border-b border-line bg-surface">
      <div className="container-page flex min-h-12 items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => (canGoBack ? navigate(-1) : navigate('/'))}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full pr-3 text-sm font-semibold text-heading hover:text-blue-700"
        >
          <ChevronLeft size={16} /> {t('common.back')}
        </button>
        <Link to="/" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink-muted no-underline hover:text-blue-700">
          {t('nav.home')} <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
