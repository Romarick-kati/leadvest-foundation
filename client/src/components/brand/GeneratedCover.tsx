import { BookOpen, Compass, FlaskConical, GraduationCap, HandHeart, Handshake, Heart, Laptop, Leaf, Lightbulb, PartyPopper, Puzzle, Sparkles, Users } from '../ui/icons';
import type { ComponentType } from 'react';

/**
 * A cover picture made from the title when no photo was chosen: the colours come from the words
 * (so each program or event keeps its own look) and the icon from the kind of activity it is.
 */
const KINDS: { re: RegExp; Icon: ComponentType<{ size?: number }> }[] = [
  { re: /(lead|mentor|confidence|public speaking|debate)/i, Icon: Compass },
  { re: /(read|story|book|literacy|library|writing|language)/i, Icon: BookOpen },
  { re: /(science|stem|math|robot|experiment|lab)/i, Icon: FlaskConical },
  { re: /(computer|digital|code|coding|tech|online|web)/i, Icon: Laptop },
  { re: /(art|craft|draw|paint|music|dance|drama|creative)/i, Icon: Sparkles },
  { re: /(garden|farm|nature|environment|green|health|sport|football|play)/i, Icon: Leaf },
  { re: /(volunteer|community|service|charity|support)/i, Icon: HandHeart },
  { re: /(partner|business|career|skills|entrepreneur|job)/i, Icon: Handshake },
  { re: /(family|parent|child|kids|youth|young)/i, Icon: Users },
  { re: /(party|celebrat|festival|day|fair|open|launch|graduation)/i, Icon: PartyPopper },
  { re: /(workshop|class|course|training|learn|school)/i, Icon: GraduationCap },
  { re: /(idea|innovation|think|problem)/i, Icon: Lightbulb },
  { re: /(game|puzzle|quiz|challenge)/i, Icon: Puzzle },
];
const PALETTES: [string, string][] = [
  ['#1d4ed8', '#0f766e'], ['#0f766e', '#65a30d'], ['#7c3aed', '#1d4ed8'], ['#b45309', '#e11d48'], ['#0369a1', '#0d9488'], ['#be185d', '#7c3aed'],
];
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function GeneratedCover({ title, className }: { title: string; className?: string }) {
  const h = hash(title || 'lead vest');
  const [a, b] = PALETTES[h % PALETTES.length]!;
  const Icon = KINDS.find((k) => k.re.test(title))?.Icon ?? [Heart, Users, Sparkles, BookOpen][h % 4]!;
  const id = `gc${h}`;
  return (
    <div className={className} role="img" aria-label={title}>
      <svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>
        </defs>
        <rect width="400" height="250" fill={`url(#${id})`} />
        <circle cx={60 + (h % 80)} cy="40" r="90" fill="#fff" opacity="0.10" />
        <circle cx={340 - (h % 60)} cy="230" r="120" fill="#fff" opacity="0.10" />
        <circle cx="330" cy="50" r="22" fill="#fbbf24" opacity="0.85" />
        <circle cx="70" cy="200" r="10" fill="#fff" opacity="0.5" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-navy shadow-lift sm:h-24 sm:w-24"><Icon size={38} /></span>
      </span>
    </div>
  );
}
