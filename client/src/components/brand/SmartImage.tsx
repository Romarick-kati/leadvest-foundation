import { useState } from 'react';
import { images, resolveImage, type ImageEntry, type ImageKey } from '../../config/images';
import { cn } from '../../lib/cn';
import { Illustration } from './Illustration';
import { GeneratedCover } from './GeneratedCover';

/**
 * Renders an image from the central registry inside a box of fixed aspect ratio, so the page
 * never shifts while it loads. Photos are lazy loaded unless marked priority (the main image
 * at the top of a page). Until a photo is supplied, or if it fails to load, an illustration
 * in the site's style fills the same box.
 */
export function SmartImage({ image, dbKey, alt, className, priority, rounded = 'rounded-xl', sizes = '(min-width: 1024px) 50vw, 100vw', ratio, fill, coverTitle }: {
  image?: ImageKey;
  dbKey?: string | null;
  alt?: string | null;
  className?: string;
  priority?: boolean;
  rounded?: string;
  sizes?: string;
  /** Overrides the registry ratio, for example to keep every card in a grid the same shape. */
  ratio?: number;
  /** Fills a parent that already has a fixed size (for example a full bleed card background). */
  fill?: boolean;
  /** When no image was chosen, a cover made from this title is shown instead of the default illustration. */
  coverTitle?: string;
}) {
  const entry: ImageEntry = dbKey !== undefined ? resolveImage(dbKey, image ?? 'program.default') : images[image ?? 'program.default'];
  const [failed, setFailed] = useState(false);
  const showPhoto = entry.src && !failed;
  const generated = !dbKey && coverTitle && !failed;
  return (
    <div className={cn('relative overflow-hidden bg-blue-50', fill && 'h-full w-full', rounded, className)} style={fill ? undefined : { aspectRatio: String(ratio ?? entry.ratio) }}>
      {generated ? (
        <GeneratedCover title={coverTitle!} className="absolute inset-0" />
      ) : showPhoto ? (
        <img
          src={entry.src!}
          srcSet={entry.srcSet}
          sizes={entry.srcSet ? sizes : undefined}
          alt={alt ?? entry.alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding={priority ? 'sync' : 'async'}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
      ) : (
        <Illustration scene={entry.scene} className="absolute inset-0 h-full w-full" />
      )}
    </div>
  );
}
