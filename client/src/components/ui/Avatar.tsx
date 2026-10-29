import { assetUrl } from '../../lib/api';
import { cn } from '../../lib/cn';

export function Avatar({ name, src, size = 36, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  const url = assetUrl(src);
  return url ? (
    <img src={url} alt="" width={size} height={size} className={cn('rounded-full object-cover', className)} style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden className={cn('inline-flex items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700', className)} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials || '?'}
    </span>
  );
}
