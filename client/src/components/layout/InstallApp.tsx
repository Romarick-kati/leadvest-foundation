import { useEffect, useState } from 'react';
import { useT } from '../../i18n';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** "Install the app": appears only when the phone or browser says the site can be installed. */
export function InstallApp({ className }: { className?: string }) {
  const t = useT();
  const [event, setEvent] = useState<InstallEvent | null>(null);
  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); };
    const onInstalled = () => setEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);
  if (!event) return null;
  return (
    <button type="button" className={className} onClick={() => { void event.prompt(); setEvent(null); }}>
      {t('footer.install')}
    </button>
  );
}
