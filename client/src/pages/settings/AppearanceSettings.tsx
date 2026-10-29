import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { ACCENTS, LANGS, usePreferences, type Accent, type Lang, type Theme } from '../../lib/preferences';
import { Panel, useToast } from '../../components/ui';
import { Check, Desktop, Moon, Sun } from '../../components/ui/icons';
import { cn } from '../../lib/cn';
import { useT } from '../../i18n';
import { SettingsHeader } from './SettingsLayout';

const themes: { value: Theme; icon: React.ReactNode }[] = [
  { value: 'light', icon: <Sun size={20} /> },
  { value: 'dark', icon: <Moon size={20} /> },
  { value: 'system', icon: <Desktop size={20} /> },
];

/** Theme and interface language. Each choice applies at once and is saved to the account. */
export default function AppearanceSettings() {
  const t = useT();
  useDocumentTitle(t('settings.appearance'));
  const toast = useToast();
  const { prefs, setPreference } = usePreferences();

  const choose = async (p: { theme?: Theme; language?: Lang; accent?: Accent }) => {
    await setPreference(p);
    toast(t('settings.appearanceSaved'));
  };

  const card = (active: boolean) =>
    cn('flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left font-semibold transition-colors', active ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-line text-heading hover:border-blue-600');

  return (
    <>
      <SettingsHeader title={t('settings.appearance')} description={t('settings.appearanceDescription')} />
      <div className="space-y-6">
        <Panel title={t('settings.themeTitle')}>
          <div role="radiogroup" aria-label={t('settings.themeTitle')} className="grid gap-3 sm:grid-cols-3">
            {themes.map((th) => (
              <button key={th.value} type="button" role="radio" aria-checked={prefs.theme === th.value} onClick={() => choose({ theme: th.value })} className={card(prefs.theme === th.value)}>
                <span aria-hidden>{th.icon}</span>
                {t(`theme.${th.value}`)}
              </button>
            ))}
          </div>
          <p className="text-sm text-ink-muted">{t('settings.themeHint')}</p>
        </Panel>
        <Panel title="Colour">
          <div role="radiogroup" aria-label="Colour" className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {ACCENTS.map((a) => (
              <button key={a.value} type="button" role="radio" aria-checked={prefs.accent === a.value} onClick={() => choose({ accent: a.value })} className={cn('flex flex-col items-center gap-2 rounded-lg border-2 px-2 py-3 text-sm font-semibold transition-colors', prefs.accent === a.value ? 'border-blue-600 bg-blue-50 text-heading' : 'border-line text-heading hover:border-line-strong')}>
                <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ background: a.swatch }}>{prefs.accent === a.value && <Check size={18} />}</span>
                {a.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-ink-muted">Changes buttons, links and highlights across the whole website. It applies at once and is saved to your account.</p>
        </Panel>
        <Panel title={t('settings.languageTitle')}>
          <div role="radiogroup" aria-label={t('settings.languageTitle')} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {LANGS.map((l) => (
              <button key={l} type="button" role="radio" lang={l} aria-checked={prefs.language === l} onClick={() => choose({ language: l })} className={card(prefs.language === l)}>
                {t(`language.${l}`)}
              </button>
            ))}
          </div>
          <p className="text-sm text-ink-muted">{t('language.editorialNote')}</p>
        </Panel>
      </div>
    </>
  );
}
