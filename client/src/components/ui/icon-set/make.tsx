import type { CSSProperties } from 'react';
import type { IconDefinition } from '@fortawesome/fontawesome-common-types';

export interface IconProps {
  /** Size in pixels (sets the font size; Font Awesome icons are 1em tall). */
  size?: number;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
  spin?: boolean;
}

export type IconComponent = (props: IconProps) => React.JSX.Element;

export function make(definition: IconDefinition): IconComponent {
  const [width, height, , , path] = definition.icon;
  const d = Array.isArray(path) ? path.join(' ') : path;
  return function Icon({ size = 20, className, style, spin, 'aria-label': label }: IconProps) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={size}
        height={size}
        fill="currentColor"
        focusable="false"
        className={['fa-icon inline-block shrink-0 align-[-0.125em]', spin ? 'animate-spin motion-reduce:animate-none' : '', className].filter(Boolean).join(' ')}
        style={style}
        {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      >
        <path d={d} />
      </svg>
    );
  };
}
