import { Loader } from './icons';

export function Spinner({ size = 20, label }: { size?: number; label?: string }) {
  return (
    <span role={label ? 'status' : undefined} className="inline-flex items-center gap-2">
      <Loader size={size} spin />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}

/** Shown while a page loads: the foundation mark gently pulsing over soft placeholder blocks. */
export function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="container-page flex min-h-[50vh] flex-col items-center justify-center gap-8 py-12">
      <span className="sr-only">{label}</span>
      <div className="relative flex h-20 w-20 items-center justify-center" aria-hidden="true">
        <span className="lvf-load-ring absolute inset-0 rounded-full border-4 border-blue-100 border-t-blue-600" />
        <img src="/images/branding/logo-mark.webp" alt="" width={44} height={44} className="lvf-load-pulse h-11 w-11 object-contain" />
      </div>
      <div className="w-full max-w-xl space-y-3" aria-hidden="true">
        <div className="lvf-shimmer mx-auto h-6 w-2/3 rounded-full" />
        <div className="lvf-shimmer h-4 w-full rounded-full" />
        <div className="lvf-shimmer h-4 w-5/6 rounded-full" />
        <div className="grid grid-cols-3 gap-3 pt-3">
          <div className="lvf-shimmer h-20 rounded-xl" />
          <div className="lvf-shimmer h-20 rounded-xl" />
          <div className="lvf-shimmer h-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
