import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, assetUrl } from '../../lib/api';
import type { GalleryImage } from '../../lib/types';
import { registryPhotos } from '../../config/images';
import { useCalmMotion } from '../../lib/preferences';
import { Pause, Play } from '../ui/icons';
import { cn } from '../../lib/cn';
import { useInView } from '../motion/Reveal';

type Tile = { src: string; srcSet?: string; alt: string };

/**
 * A strip of photos that drifts slowly sideways and loops without a seam. The list is
 * rendered twice and moved by half its width, so the second copy takes the place of the
 * first. It pauses on hover, on keyboard focus and with the pause button, and for reduced
 * motion it becomes an ordinary row that can be scrolled by hand.
 */
export function PhotoMarquee({ label = 'Photos', reverse = false, className }: { label?: string; reverse?: boolean; className?: string }) {
  const calm = useCalmMotion();
  const [paused, setPaused] = useState(false);
  // Tiles keep their size from the start; their pictures are only drawn once the strip is near.
  const [ref, near] = useInView<HTMLElement>(0);
  const gallery = useQuery({ queryKey: ['gallery'], queryFn: () => api.get<GalleryImage[]>('/gallery'), staleTime: 15_000 });

  const tiles: Tile[] = [
    ...(gallery.data ?? []).map((g) => ({ src: assetUrl(g.url)!, alt: g.alt })),
    ...registryPhotos,
  ];
  if (!tiles.length) return null;

  const renderTile = (t: Tile, i: number, hidden: boolean) => (
    <li key={`${hidden ? 'b' : 'a'}${i}`} className="group/tile relative h-44 shrink-0 overflow-hidden rounded-2xl bg-blue-50 shadow-card ring-1 ring-black/5 sm:h-56" style={{ aspectRatio: i % 3 === 1 ? '3 / 4' : '4 / 3' }}>
      {near && (
        <img src={t.src} srcSet={t.srcSet} sizes="(min-width: 640px) 300px, 240px" alt={hidden ? '' : t.alt} loading="lazy" decoding="async" width={300} height={225} className="h-full w-full object-cover transition-transform duration-700 group-hover/tile:scale-105" />
      )}
    </li>
  );

  if (calm) {
    return (
      <section ref={ref} aria-label={label} className={cn('min-w-0', className)}>
        <ul className="flex gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] sm:px-6 lg:px-8" tabIndex={0} aria-label={`${label}, scroll sideways for more`}>
          {tiles.map((t, i) => renderTile(t, i, false))}
        </ul>
      </section>
    );
  }

  return (
    <section ref={ref} aria-label={label} className={cn('group/marquee relative min-w-0', className)}>
      <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
        <div
          className={cn(
            'flex w-max animate-marquee will-change-transform group-hover/marquee:[animation-play-state:paused] group-focus-within/marquee:[animation-play-state:paused]',
            reverse && '[animation-direction:reverse]',
            paused && '[animation-play-state:paused]',
          )}
          style={{ ['--marquee-duration' as string]: `${tiles.length * 4}s` }}
        >
          <ul className="flex gap-4 pr-4">{tiles.map((t, i) => renderTile(t, i, false))}</ul>
          <ul className="flex gap-4 pr-4" aria-hidden="true">{tiles.map((t, i) => renderTile(t, i, true))}</ul>
        </div>
      </div>
      <div className="mx-auto mt-4 flex max-w-7xl justify-end px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-heading shadow-soft transition-colors hover:border-blue-600 hover:text-blue-700"
          aria-pressed={paused}
        >
          {paused ? <Play size={12} /> : <Pause size={12} />}
          {paused ? 'Play moving photos' : 'Pause moving photos'}
        </button>
      </div>
    </section>
  );
}
