import { cn } from '../../lib/cn';

/**
 * Gentle decorative shapes (stars, leaves, books, clouds) for hero areas. Pure CSS
 * animation on transform and opacity only, paused automatically by the reduced motion
 * rules in index.css. Hidden from assistive technology and never covers text (pointer
 * events off, placed behind content).
 */
type Shape = 'star' | 'leaf' | 'book' | 'cloud' | 'dot' | 'sprout';

interface Item {
  shape: Shape;
  className: string;
  anim: 'animate-float' | 'animate-float-slow' | 'animate-drift' | 'animate-twinkle';
  delay?: string;
  size: number;
}

const presets: Record<'hero' | 'learning' | 'quiet', Item[]> = {
  hero: [
    { shape: 'star', className: 'left-[6%] top-[14%] hidden lg:block', anim: 'animate-twinkle', size: 22 },
    { shape: 'leaf', className: 'right-[8%] top-[10%] hidden sm:block', anim: 'animate-drift', size: 34, delay: '1s' },
    { shape: 'cloud', className: 'left-[42%] top-[4%] hidden lg:block', anim: 'animate-float-slow', size: 70 },
    { shape: 'book', className: 'left-[3%] bottom-[18%] hidden md:block', anim: 'animate-float', size: 36, delay: '2s' },
    { shape: 'dot', className: 'right-[30%] bottom-[10%]', anim: 'animate-twinkle', size: 12, delay: '1.5s' },
    { shape: 'star', className: 'right-[4%] bottom-[30%] hidden md:block', anim: 'animate-twinkle', size: 16, delay: '0.8s' },
  ],
  learning: [
    { shape: 'star', className: 'left-[5%] top-[18%]', anim: 'animate-twinkle', size: 26 },
    { shape: 'cloud', className: 'right-[6%] top-[8%]', anim: 'animate-float-slow', size: 80 },
    { shape: 'sprout', className: 'left-[12%] bottom-[8%] hidden sm:block', anim: 'animate-float', size: 40, delay: '1s' },
    { shape: 'book', className: 'right-[14%] bottom-[12%] hidden md:block', anim: 'animate-drift', size: 40, delay: '2s' },
    { shape: 'star', className: 'right-[38%] top-[6%] hidden lg:block', anim: 'animate-twinkle', size: 18, delay: '1.2s' },
    { shape: 'dot', className: 'left-[48%] bottom-[6%]', anim: 'animate-twinkle', size: 14, delay: '0.4s' },
  ],
  quiet: [
    { shape: 'dot', className: 'left-[8%] top-[20%]', anim: 'animate-twinkle', size: 10 },
    { shape: 'leaf', className: 'right-[6%] bottom-[20%] hidden md:block', anim: 'animate-drift', size: 28 },
  ],
};

export function FloatingShapes({ preset = 'hero', className }: { preset?: keyof typeof presets; className?: string }) {
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 -z-0 overflow-hidden', className)}>
      {presets[preset].map((item, i) => (
        <span key={i} className={cn('absolute', item.className, item.anim)} style={{ animationDelay: item.delay }}>
          <ShapeSvg shape={item.shape} size={item.size} />
        </span>
      ))}
    </div>
  );
}

function ShapeSvg({ shape, size }: { shape: Shape; size: number }) {
  switch (shape) {
    case 'star':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z" fill="#FFD65A" stroke="#142B4A" strokeWidth="1.4" strokeLinejoin="round" /></svg>
      );
    case 'leaf':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24"><path d="M4 20C4 10 10 4 20 4c0 10-6 16-16 16z" fill="#BFEAD5" stroke="#142B4A" strokeWidth="1.4" /><path d="M4 20L14 10" stroke="#142B4A" strokeWidth="1.4" /></svg>
      );
    case 'book':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24"><path d="M3 5c3-1.5 6-1.5 9 0v14c-3-1.5-6-1.5-9 0zM12 5c3-1.5 6-1.5 9 0v14c-3-1.5-6-1.5-9 0z" fill="#FFFFFF" stroke="#3478F6" strokeWidth="1.6" strokeLinejoin="round" /></svg>
      );
    case 'cloud':
      return (
        <svg width={size} height={size * 0.6} viewBox="0 0 50 30"><path d="M14 28a10 10 0 010-20 13 13 0 0124-1 9 9 0 012 21z" fill="#FFFFFF" stroke="#DCEBFF" strokeWidth="1.5" /></svg>
      );
    case 'sprout':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24"><path d="M12 22V11" stroke="#142B4A" strokeWidth="1.8" strokeLinecap="round" /><path d="M12 13c-4 0-6-3-6-6 4 0 6 2.5 6 6zM12 11c0-4 2.5-6.5 6.5-6.5 0 4-2.5 6.5-6.5 6.5z" fill="#BFEAD5" stroke="#142B4A" strokeWidth="1.4" /></svg>
      );
    default:
      return <svg width={size} height={size} viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#3478F6" opacity="0.5" /></svg>;
  }
}
