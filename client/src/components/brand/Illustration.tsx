import { useId } from 'react';
import type { ImageEntry } from '../../config/images';

/**
 * Editorial style illustrations used wherever an approved photograph has not been supplied.
 * People are drawn without faces, in a range of skin tones, so no real person is implied.
 * Each scene matches the content it stands in for (classroom, workshop, mentoring, event).
 */

const C = {
  navy: '#14213D',
  blue: '#2563EB',
  blueSoft: '#DBE6FE',
  teal: '#0F766E',
  tealSoft: '#CCEFEA',
  sun: '#F7C948',
  white: '#FFFFFF',
  line: '#CBD5E1',
};
const SKIN = ['#8D5524', '#C68642', '#5C3A21', '#E0AC69', '#A0673C'];
const HAIR = ['#1F1A17', '#3B2A20', '#14213D', '#2B1B12', '#4A3426'];

export function Illustration({ scene, className }: { scene: ImageEntry['scene']; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 640 480" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#EFF4FF" />
          <stop offset="1" stopColor="#F5F7FB" />
        </linearGradient>
      </defs>
      <rect width="640" height="480" fill={`url(#bg-${id})`} />
      <circle cx="560" cy="70" r="120" fill={C.blueSoft} opacity="0.55" />
      <circle cx="40" cy="460" r="140" fill={C.tealSoft} opacity="0.45" />
      {scene === 'team' && <Classroom />}
      {scene === 'workshop' && <Workshop />}
      {scene === 'books' && <Reading />}
      {scene === 'mentor' && <Mentoring />}
      {scene === 'community' && <Community />}
      {scene === 'event' && <EventStage />}
      {scene === 'stars' && <EventStage />}
      {scene === 'growth' && <Growth />}
      {scene === 'path' && <Community />}
    </svg>
  );
}

/** A seated or standing person seen from the front, without facial features. */
function Person({ x, y, s = 1, tone = 0, shirt = C.blue, standing = false, arm }: { x: number; y: number; s?: number; tone?: number; shirt?: string; standing?: boolean; arm?: 'up' | 'point' }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {standing && (
        <>
          <rect x="-16" y="70" width="13" height="78" rx="6" fill={C.navy} />
          <rect x="3" y="70" width="13" height="78" rx="6" fill={C.navy} />
        </>
      )}
      <path d="M-34 86 C-34 40 34 40 34 86 V96 H-34Z" fill={shirt} />
      {arm === 'up' && <path d="M24 56 L52 6" stroke={shirt} strokeWidth="14" strokeLinecap="round" />}
      {arm === 'point' && <path d="M26 58 L70 34" stroke={shirt} strokeWidth="14" strokeLinecap="round" />}
      <rect x="-8" y="22" width="16" height="16" rx="6" fill={SKIN[tone % SKIN.length]} />
      <circle cx="0" cy="8" r="22" fill={SKIN[tone % SKIN.length]} />
      <path d="M-23 6 C-23 -22 23 -22 23 4 C14 -6 -6 -8 -23 6Z" fill={HAIR[tone % HAIR.length]} />
    </g>
  );
}

function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 C-30 -20 -34 -54 -10 -70 C-4 -44 4 -28 0 0Z" fill={C.teal} />
      <path d="M0 0 C26 -14 36 -46 16 -66 C6 -40 0 -26 0 0Z" fill="#14B8A6" />
      <path d="M-18 0 H18 L13 34 H-13Z" fill={C.white} stroke={C.line} strokeWidth="2" />
    </g>
  );
}

function Classroom() {
  return (
    <g>
      <rect x="70" y="60" width="300" height="170" rx="14" fill={C.white} stroke={C.line} strokeWidth="2" />
      <path d="M100 190 L160 150 L210 168 L270 112 L330 128" fill="none" stroke={C.blue} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="270" cy="112" r="9" fill={C.sun} />
      <rect x="100" y="86" width="110" height="10" rx="5" fill={C.navy} opacity="0.85" />
      <rect x="100" y="106" width="70" height="8" rx="4" fill={C.line} />
      <Person x={470} y={210} tone={2} shirt={C.teal} standing arm="point" />
      <rect x="40" y="350" width="560" height="22" rx="8" fill={C.navy} opacity="0.9" />
      <Person x={150} y={270} tone={1} shirt={C.blue} />
      <Person x={300} y={268} tone={3} shirt={C.sun} />
      <Person x={450} y={272} tone={4} shirt="#7C3AED" />
      <rect x="110" y="330" width="82" height="22" rx="4" fill={C.white} stroke={C.line} strokeWidth="2" />
      <path d="M250 352 h100 l-10 -38 h-80z" fill="#334155" />
      <rect x="262" y="318" width="76" height="4" fill={C.blueSoft} />
      <rect x="410" y="330" width="78" height="22" rx="4" fill={C.tealSoft} />
      <Plant x={580} y={316} s={0.9} />
    </g>
  );
}

function Workshop() {
  return (
    <g>
      <rect x="380" y="70" width="210" height="150" rx="12" fill={C.white} stroke={C.line} strokeWidth="2" />
      <rect x="402" y="96" width="80" height="54" rx="8" fill={C.blueSoft} />
      <rect x="494" y="96" width="74" height="54" rx="8" fill={C.tealSoft} />
      <rect x="402" y="162" width="166" height="10" rx="5" fill={C.line} />
      <rect x="402" y="182" width="110" height="10" rx="5" fill={C.line} />
      <rect x="474" y="220" width="16" height="130" fill={C.line} />
      <Person x={330} y={196} tone={0} shirt={C.navy} standing arm="point" />
      <ellipse cx="200" cy="380" rx="180" ry="26" fill={C.navy} opacity="0.08" />
      <rect x="60" y="330" width="300" height="20" rx="8" fill={C.white} stroke={C.line} strokeWidth="2" />
      <Person x={110} y={250} tone={3} shirt={C.teal} />
      <Person x={230} y={252} tone={1} shirt={C.blue} />
      <rect x="86" y="314" width="52" height="16" rx="3" fill={C.sun} />
      <rect x="206" y="312" width="58" height="18" rx="3" fill={C.white} stroke={C.line} strokeWidth="2" />
      <circle cx="560" cy="390" r="26" fill={C.sun} opacity="0.9" />
    </g>
  );
}

function Reading() {
  return (
    <g>
      <rect x="70" y="80" width="150" height="230" rx="10" fill={C.white} stroke={C.line} strokeWidth="2" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={86} y={100 + i * 52} width={118} height="6" rx="3" fill={C.line} />
          <rect x={86 + (i % 2) * 10} y={112 + i * 52} width={22 + i * 6} height="30" rx="3" fill={[C.blue, C.teal, C.sun, C.navy][i]} />
          <rect x={116 + (i % 2) * 10} y={116 + i * 52} width="18" height="26" rx="3" fill={[C.tealSoft, C.blueSoft, C.blue, C.sun][i]} />
        </g>
      ))}
      <path d="M260 370 C260 300 560 300 560 370 V392 H260Z" fill={C.white} stroke={C.line} strokeWidth="2" />
      <Person x={360} y={236} tone={4} shirt={C.teal} />
      <Person x={470} y={262} s={0.82} tone={1} shirt={C.sun} />
      <path d="M380 318 q40 -26 80 0 v38 q-40 -26 -80 0z" fill={C.white} stroke={C.navy} strokeWidth="3" />
      <path d="M420 318 v38" stroke={C.navy} strokeWidth="2" />
      <Plant x={590} y={350} />
    </g>
  );
}

function Mentoring() {
  return (
    <g>
      <rect x="120" y="340" width="400" height="18" rx="8" fill={C.navy} opacity="0.9" />
      <Person x={230} y={226} tone={2} shirt={C.blue} />
      <Person x={410} y={244} s={0.88} tone={3} shirt={C.teal} />
      <rect x="270" y="300" width="100" height="40" rx="6" fill="#334155" />
      <rect x="278" y="306" width="84" height="28" rx="3" fill={C.blueSoft} />
      <path d="M302 330 l14 -10 10 6 16 -14" fill="none" stroke={C.blue} strokeWidth="3" strokeLinecap="round" />
      <g transform="translate(470 120)">
        <rect x="0" y="0" width="120" height="70" rx="16" fill={C.white} stroke={C.line} strokeWidth="2" />
        <path d="M24 70 l-6 22 24 -22" fill={C.white} stroke={C.line} strokeWidth="2" />
        <rect x="18" y="20" width="84" height="8" rx="4" fill={C.line} />
        <rect x="18" y="38" width="56" height="8" rx="4" fill={C.tealSoft} />
      </g>
      <g transform="translate(60 110)">
        <circle cx="40" cy="40" r="40" fill={C.sun} />
        <path d="M24 42 l12 12 22 -26" fill="none" stroke={C.navy} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </g>
  );
}

function Community() {
  return (
    <g>
      <path d="M150 300 V190 L320 100 L490 190 V300Z" fill={C.white} stroke={C.line} strokeWidth="2" />
      <path d="M130 196 L320 90 L510 196" fill="none" stroke={C.navy} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="292" y="220" width="56" height="80" rx="6" fill={C.blue} />
      <rect x="190" y="210" width="60" height="44" rx="6" fill={C.blueSoft} />
      <rect x="390" y="210" width="60" height="44" rx="6" fill={C.tealSoft} />
      <ellipse cx="320" cy="400" rx="260" ry="24" fill={C.navy} opacity="0.07" />
      <Person x={110} y={244} s={0.95} tone={0} shirt={C.teal} standing />
      <Person x={240} y={262} s={0.82} tone={3} shirt={C.sun} standing />
      <Person x={400} y={262} s={0.82} tone={1} shirt={C.blue} standing />
      <Person x={530} y={244} s={0.95} tone={2} shirt={C.navy} standing />
    </g>
  );
}

function EventStage() {
  return (
    <g>
      <rect x="120" y="60" width="400" height="150" rx="14" fill={C.navy} />
      <rect x="146" y="86" width="190" height="14" rx="7" fill={C.white} opacity="0.9" />
      <rect x="146" y="112" width="130" height="10" rx="5" fill={C.white} opacity="0.5" />
      <circle cx="450" cy="134" r="40" fill={C.sun} />
      <path d="M430 134 l14 14 26 -30" fill="none" stroke={C.navy} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="90" y="220" width="460" height="16" rx="6" fill="#334155" />
      <Person x={320} y={150} s={0.62} tone={4} shirt={C.teal} standing arm="up" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Person key={`a${i}`} x={110 + i * 105} y={318} s={0.78} tone={i} shirt={[C.blue, C.teal, C.sun, '#7C3AED', C.blue][i]} />
      ))}
      <rect x="0" y="392" width="640" height="88" fill={C.white} opacity="0.85" />
    </g>
  );
}

function Growth() {
  return (
    <g>
      <rect x="80" y="90" width="260" height="210" rx="14" fill={C.white} stroke={C.line} strokeWidth="2" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={110 + i * 44} y={260 - (i + 1) * 30} width="26" height={(i + 1) * 30} rx="5" fill={i === 4 ? C.sun : i % 2 ? C.teal : C.blue} />
      ))}
      <rect x="104" y="270" width="212" height="4" rx="2" fill={C.line} />
      <Plant x={440} y={320} s={1.9} />
      <Person x={540} y={238} s={0.92} tone={1} shirt={C.blue} standing />
      <ellipse cx="420" cy="400" rx="200" ry="20" fill={C.navy} opacity="0.07" />
    </g>
  );
}
