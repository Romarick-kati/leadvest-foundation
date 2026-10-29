import { m } from 'framer-motion';
import { useCalmMotion } from '../../lib/preferences';

/**
 * A single, short burst of shapes when a learner finishes an activity. Runs once
 * (about one second), uses few particles, and is skipped entirely for reduced motion.
 */
export function Celebration() {
  const calm = useCalmMotion();
  if (calm) return null;
  const colors = ['#FFD65A', '#3478F6', '#BFEAD5', '#142B4A'];
  const pieces = Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2;
    const dist = 90 + (i % 3) * 30;
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 20, color: colors[i % colors.length], round: i % 2 === 0, rotate: (i % 5) * 70 };
  });
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible">
      {pieces.map((p, i) => (
        <m.span
          key={i}
          className="absolute block"
          style={{ width: 10, height: p.round ? 10 : 14, background: p.color, borderRadius: p.round ? 999 : 3 }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
          animate={{ x: p.x, y: p.y + 40, opacity: 0, scale: 1, rotate: p.rotate }}
          transition={{ duration: 1.1, ease: 'easeOut', delay: (i % 4) * 0.03 }}
        />
      ))}
    </div>
  );
}
