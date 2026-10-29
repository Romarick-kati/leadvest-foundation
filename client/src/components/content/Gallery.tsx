import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, assetUrl } from '../../lib/api';
import type { GalleryImage } from '../../lib/types';
import { ChevronLeft, ChevronRight, Images, X } from '../ui/icons';
import { EmptyState } from '../ui';
import { Stagger } from '../motion/Reveal';

/**
 * Photo gallery fed by Dashboard > Media (folder: gallery, with alt text). Thumbnails open a
 * full screen viewer on the native dialog element: Escape closes, arrow keys and buttons move
 * between photos, and focus returns to the thumbnail afterwards.
 */
export function Gallery() {
  const q = useQuery({ queryKey: ['gallery'], queryFn: () => api.get<GalleryImage[]>('/gallery'), staleTime: 15_000 });
  const [open, setOpen] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const images = q.data ?? [];

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open !== null && !d.open) d.showModal?.();
    if (open === null && d.open) d.close?.();
  }, [open]);

  if (q.isLoading) return <div className="skeleton aspect-[16/7] rounded-2xl" />;
  if (!images.length) {
    return (
      <EmptyState title="Photos will appear here">
        The foundation will add photos from its programs and events, only with the permission of everyone who can be identified.
      </EmptyState>
    );
  }

  const move = (dir: 1 | -1) => setOpen((i) => (i === null ? i : (i + dir + images.length) % images.length));
  const close = () => {
    setOpen(null);
    triggerRef.current?.focus();
  };
  const current = open !== null ? images[open] : null;

  return (
    <>
      <Stagger as="ul" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <li key={img.id} className={i === 0 ? 'col-span-2 row-span-2' : ''}>
            <button
              type="button"
              onClick={(e) => {
                triggerRef.current = e.currentTarget;
                setOpen(i);
              }}
              className="group relative block aspect-square w-full overflow-hidden rounded-xl bg-canvas"
              aria-label={`Open photo: ${img.alt}`}
            >
              <img src={assetUrl(img.url)!} alt="" loading="lazy" decoding="async" width={600} height={600} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <span className="absolute inset-0 bg-navy/0 transition-colors group-hover:bg-navy/20" aria-hidden="true" />
            </button>
          </li>
        ))}
      </Stagger>

      <dialog
        ref={dialogRef}
        aria-label="Photo viewer"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') move(1);
          if (e.key === 'ArrowLeft') move(-1);
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-navy/95 p-0 text-white backdrop:bg-navy/80"
      >
        {current && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-4 p-3 sm:p-4">
              <p className="flex items-center gap-2 text-sm text-white/75" aria-live="polite">
                <Images size={14} /> {open! + 1} of {images.length}
              </p>
              <button type="button" onClick={close} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close photo viewer">
                <X size={20} />
              </button>
            </div>
            <figure className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-3 pb-4 sm:px-16">
              <img src={assetUrl(current.url)!} alt={current.alt} className="max-h-[calc(100dvh-10rem)] w-auto max-w-full rounded-lg object-contain" />
              <figcaption className="max-w-2xl text-center text-sm text-white/85">{current.alt}</figcaption>
            </figure>
            {images.length > 1 && (
              <div className="flex justify-center gap-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:absolute sm:inset-x-4 sm:top-1/2 sm:justify-between sm:pb-0">
                <button type="button" onClick={() => move(-1)} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Previous photo">
                  <ChevronLeft size={18} />
                </button>
                <button type="button" onClick={() => move(1)} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Next photo">
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
