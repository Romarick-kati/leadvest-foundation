import { cn } from '../../lib/cn';

/**
 * Soft background motion for hero and call to action bands: blurred colour fields that drift
 * slowly, a fine dot grid and a thin ring. Transform only, behind content, hidden from
 * assistive technology, and frozen by the reduced motion rules in index.css.
 */
export function Ambient({ tone = 'light', className }: { tone?: 'light' | 'dark'; className?: string }) {
  const dark = tone === 'dark';
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}>
      <div className={cn('absolute -right-24 -top-32 h-[26rem] w-[26rem] animate-orb rounded-full blur-3xl', dark ? 'bg-blue-600/40' : 'bg-blue-600/[0.20]')} />
      <div className={cn('absolute -bottom-40 -left-24 h-[22rem] w-[22rem] animate-orb-slow rounded-full blur-3xl', dark ? 'bg-teal/40' : 'bg-teal/[0.18]')} />
      <div className="absolute left-[4%] top-[5%] h-5 w-5 animate-drift rounded-lg bg-sun/70 sm:h-7 sm:w-7 lg:left-[6%] lg:top-[18%] lg:h-10 lg:w-10 lg:rounded-2xl" />
      <div className="absolute bottom-[10%] right-[12%] h-3 w-3 animate-twinkle rounded-full bg-sun sm:h-4 sm:w-4 lg:bottom-[14%] lg:right-[30%] lg:h-5 lg:w-5" />
      <div className="absolute bottom-[7%] left-[8%] h-7 w-7 animate-float-delayed rounded-full border-4 border-teal/40 sm:h-9 sm:w-9 lg:bottom-[22%] lg:left-[44%] lg:h-14 lg:w-14 lg:border-[6px]" />
      <svg className={cn('absolute -right-3 top-[4%] h-20 w-20 animate-spin-slow sm:right-[4%] sm:h-28 sm:w-28 lg:right-[8%] lg:top-[12%] lg:h-40 lg:w-40', dark ? 'text-white/30' : 'text-blue-600/40')} viewBox="0 0 160 160" fill="none">
        <circle cx="80" cy="80" r="76" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 10" />
      </svg>
      <svg className={cn('absolute right-[22%] top-[3%] h-10 w-16 sm:h-16 sm:w-24 lg:left-[40%] lg:right-auto lg:top-[8%] lg:h-24 lg:w-36', dark ? 'text-white/30' : 'text-navy/[0.25]')} viewBox="0 0 144 96" fill="currentColor">
        {Array.from({ length: 24 }, (_, i) => (
          <circle key={i} cx={8 + (i % 6) * 26} cy={8 + Math.floor(i / 6) * 26} r="2.5" />
        ))}
      </svg>
    </div>
  );
}
