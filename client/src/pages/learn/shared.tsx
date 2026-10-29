// The rounded learning font loads only on learning pages.
import '@fontsource-variable/nunito';
import { BookOpen, Compass, Heart, Leaf, MessageCircle, Star, Award } from '../../components/ui/icons';
import { m } from 'framer-motion';
import { cn } from '../../lib/cn';

export const themeStyles = {
  sky: { card: 'bg-blue-50 border-blue-100', icon: 'bg-blue-600 text-white', accent: 'text-blue-700', bar: 'blue' as const },
  sun: { card: 'bg-sun-100 border-sun', icon: 'bg-sun text-navy', accent: 'text-navy', bar: 'sun' as const },
  mint: { card: 'bg-mint-50 border-mint', icon: 'bg-mint text-heading', accent: 'text-mint-700', bar: 'mint' as const },
};

export function TopicIcon({ icon, size = 28 }: { icon: string; size?: number }) {
  const props = { size, 'aria-hidden': true } as const;
  switch (icon) {
    case 'star': return <Star {...props} />;
    case 'leaf': return <Leaf {...props} />;
    case 'compass': return <Compass {...props} />;
    case 'chat': return <MessageCircle {...props} />;
    case 'heart': return <Heart {...props} />;
    default: return <BookOpen {...props} />;
  }
}

export interface Badge { id: string; title: string; description: string; earned: boolean }

export function BadgeMedal({ badge, index = 0 }: { badge: Badge; index?: number }) {
  return (
    <m.li
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: index * 0.06 }}
      className={cn('flex flex-col items-center rounded-xl border p-4 text-center', badge.earned ? 'border-sun bg-sun-100' : 'border-dashed border-line-strong bg-surface')}
    >
      <span className={cn('mb-2 flex h-14 w-14 items-center justify-center rounded-full', badge.earned ? 'bg-sun text-navy shadow-soft' : 'bg-navy-50 text-ink-muted')}>
        <Award size={28} aria-hidden />
      </span>
      <span className="font-play text-base font-extrabold text-heading">{badge.title}</span>
      <span className="mt-0.5 text-caption text-ink-muted">{badge.description}</span>
      <span className="sr-only">{badge.earned ? 'Earned' : 'Not earned yet'}</span>
    </m.li>
  );
}
