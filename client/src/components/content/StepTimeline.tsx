import type { ReactNode } from 'react';
import type { IconComponent } from '../ui/icons';
import { useInView } from '../motion/Reveal';
import { cn } from '../../lib/cn';

export interface Step {
  icon: IconComponent;
  title: string;
  text: ReactNode;
}

/**
 * Numbered steps joined by a line that draws itself when the section scrolls into view.
 * Vertical on phones and tablets, horizontal on wide screens. An ordered list, so screen
 * readers announce the order; the motion is decoration only and stops for reduced motion.
 */
export function StepTimeline({ steps, className }: { steps: Step[]; className?: string }) {
  const [ref, inView] = useInView<HTMLOListElement>(0.25);
  const cols = steps.length >= 5 ? 'lg:grid-cols-5' : steps.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3';
  return (
    <ol ref={ref} className={cn('relative grid gap-8 lg:gap-6', cols, className)}>
      <span aria-hidden="true" className="absolute bottom-6 left-[1.375rem] top-6 w-0.5 rounded-full bg-line lg:bottom-auto lg:left-6 lg:right-6 lg:top-[1.375rem] lg:h-0.5 lg:w-auto" />
      <span
        aria-hidden="true"
        className={cn(
          'absolute bottom-6 left-[1.375rem] top-6 w-0.5 origin-top rounded-full bg-gradient-to-b from-blue-600 to-teal transition-transform duration-[1400ms] ease-out lg:bottom-auto lg:left-6 lg:right-6 lg:top-[1.375rem] lg:h-0.5 lg:w-auto lg:origin-left lg:bg-gradient-to-r',
          inView ? 'scale-100' : 'max-lg:scale-y-0 lg:scale-x-0',
        )}
      />
      {steps.map(({ icon: Icon, title, text }, i) => (
        <li
          key={title}
          className={cn('relative flex gap-5 transition-[opacity,transform] duration-700 lg:flex-col lg:gap-4', inView ? 'translate-y-0 opacity-100' : 'motion-safe:translate-y-3 motion-safe:opacity-0')}
          style={{ transitionDelay: inView ? `${200 + i * 160}ms` : undefined }}
        >
          <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-blue-700 shadow-card ring-1 ring-line">
            <Icon size={17} />
          </span>
          <div className="min-w-0 pt-1 lg:pt-0">
            <p className="text-caption font-bold uppercase tracking-[0.12em] text-teal">Step {i + 1}</p>
            <h3 className="mt-1 text-h4">{title}</h3>
            <div className="mt-1.5 text-ink-muted">{text}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
