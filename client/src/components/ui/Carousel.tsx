import { Children, useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from './icons';
import { useCalmMotion } from '../../lib/preferences';
import { cn } from '../../lib/cn';

/**
 * Accessible carousel. Slides sit on a native scroll snap track, so touch swiping and
 * trackpads work without script. Previous and next buttons move one slide; arrow keys work
 * when the carousel has focus. Optional auto advance has a visible pause button, stops while
 * the pointer or keyboard focus is inside, and never runs for reduced motion.
 */
export function Carousel({
  label,
  children,
  slideClassName = 'basis-[85%] sm:basis-[calc(50%-0.75rem)] lg:basis-[calc(33.333%-1rem)]',
  autoPlay = false,
  interval = 6000,
  className,
}: {
  label: string;
  children: ReactNode;
  slideClassName?: string;
  autoPlay?: boolean;
  interval?: number;
  className?: string;
}) {
  const slides = Children.toArray(children);
  const trackRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const calm = useCalmMotion();
  const [index, setIndex] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [playing, setPlaying] = useState(autoPlay);
  const [hovered, setHovered] = useState(false);
  const running = playing && !hovered && !calm && slides.length > 1;

  const measure = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    const first = t.children[0] as HTMLElement | undefined;
    const step = first ? first.offsetWidth + parseFloat(getComputedStyle(t).columnGap || '0') : t.clientWidth;
    setIndex(Math.round(t.scrollLeft / Math.max(1, step)));
    setAtStart(t.scrollLeft <= 4);
    setAtEnd(t.scrollLeft + t.clientWidth >= t.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    measure();
    t.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      t.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [measure, slides.length]);

  const go = useCallback(
    (dir: 1 | -1, loop = false) => {
      const t = trackRef.current;
      if (!t) return;
      const first = t.children[0] as HTMLElement | undefined;
      const step = first ? first.offsetWidth + parseFloat(getComputedStyle(t).columnGap || '0') : t.clientWidth;
      const end = t.scrollLeft + t.clientWidth >= t.scrollWidth - 4;
      const behavior = calm ? 'auto' : 'smooth';
      if (loop && dir === 1 && end) t.scrollTo({ left: 0, behavior });
      else t.scrollBy({ left: dir * step, behavior });
    },
    [calm],
  );

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => go(1, true), interval);
    return () => clearInterval(timer);
  }, [running, interval, go]);

  if (!slides.length) return null;
  const btn =
    'flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-heading shadow-soft transition-colors hover:border-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-heading';

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      className={cn('min-w-0', className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setHovered(false)}
    >
      <div
        ref={trackRef}
        id={id}
        tabIndex={0}
        aria-live={running ? 'off' : 'polite'}
        className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-px-4 px-4 pb-4 pt-1 [scrollbar-width:none] focus-visible:outline-offset-4 sm:-mx-1 sm:scroll-px-1 sm:px-1 [&::-webkit-scrollbar]:hidden"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') (e.preventDefault(), go(1));
          if (e.key === 'ArrowLeft') (e.preventDefault(), go(-1));
        }}
      >
        {slides.map((slide, i) => (
          <div key={i} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`} className={cn('min-w-0 shrink-0 snap-start', slideClassName)}>
            {slide}
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {slides.map((_, i) => (
              <span key={i} className={cn('h-1.5 rounded-full transition-all duration-300', i === index ? 'w-6 bg-blue-600' : 'w-1.5 bg-line-strong')} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {autoPlay && !calm && (
              <button type="button" className={btn} onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause automatic slides' : 'Play automatic slides'}>
                {playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
            )}
            <button type="button" className={btn} onClick={() => go(-1)} disabled={atStart} aria-controls={id} aria-label="Previous slide">
              <ChevronLeft size={16} />
            </button>
            <button type="button" className={btn} onClick={() => go(1)} disabled={atEnd} aria-controls={id} aria-label="Next slide">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
