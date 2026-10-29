import { Globe, Moon, Sun } from '../ui/icons';
import { LANGS, usePreferences, type Lang, type Theme } from '../../lib/preferences';
import { useT } from '../../i18n';
import { cn } from '../../lib/cn';

/**
 * Switches between light and dark from whatever is showing now. Light is the default. Following the device setting
 * (system), and can be chosen again in Settings.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useT();
  const { prefs, resolvedTheme, setPreference } = usePreferences();
  // Moon while light (tap for dark), sun while dark (tap for light).
  const Icon = resolvedTheme === 'dark' ? Sun : Moon;
  const next: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={() => setPreference({ theme: next })}
      aria-label={t('theme.change', { name: t(`theme.${prefs.theme}`) })}
      title={t('theme.change', { name: t(`theme.${prefs.theme}`) })}
      className={cn('inline-flex h-11 w-11 items-center justify-center rounded-full text-heading transition-colors hover:bg-canvas hover:text-blue-700', className)}
    >
      <Icon size={17} />
    </button>
  );
}

const SIZES = ['standard', 'large', 'larger'] as const;
/** Cycles the text size: standard, large, larger. Saved to the account like Settings > Accessibility. */
export function TextSizeToggle({ className }: { className?: string }) {
  const { prefs, setPreference } = usePreferences();
  const i = Math.max(0, SIZES.indexOf(prefs.textSize));
  const next = SIZES[(i + 1) % SIZES.length]!;
  const label = `Text size: ${prefs.textSize}. Change to ${next}`;
  return (
    <button type="button" onClick={() => setPreference({ textSize: next })} aria-label={label} title={label} className={cn('inline-flex h-11 min-w-11 items-center justify-center gap-0.5 rounded-full px-2 font-bold text-heading transition-colors hover:bg-canvas hover:text-blue-700', className)}>
      <span className={i === 0 ? 'text-base' : 'text-sm'} aria-hidden>A</span>
      <span className={i === 2 ? 'text-2xl' : 'text-lg'} aria-hidden>A</span>
    </button>
  );
}

/** Native select, so it works the same with touch, mouse, keyboard and screen readers. */
export function LanguageSelect({ className, compact }: { className?: string; compact?: boolean }) {
  const t = useT();
  const { prefs, setPreference } = usePreferences();
  return (
    <label className={cn('relative inline-flex h-11 items-center rounded-full bg-surface text-heading transition-colors hover:bg-canvas focus-within:bg-canvas', className)}>
      <span className="sr-only">{t('language.label')}</span>
      <Globe size={15} className="pointer-events-none absolute left-3 text-blue-700" />
      <select
        value={prefs.language}
        onChange={(e) => setPreference({ language: e.target.value as Lang })}
        className={cn('h-11 cursor-pointer appearance-none rounded-full bg-transparent pl-8 pr-3 text-sm font-semibold text-heading focus:outline-none [&>option]:bg-surface [&>option]:text-heading', compact && 'w-[4.25rem] uppercase')}
      >
        {LANGS.map((l) => (
          <option key={l} value={l} lang={l}>
            {compact ? l.toUpperCase() : t(`language.${l}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
