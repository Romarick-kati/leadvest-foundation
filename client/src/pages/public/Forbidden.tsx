import { useT } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { ButtonLink } from '../../components/ui';
import { StatusPage } from '../../components/ui/StatusPage';
import { Lock } from '../../components/ui/icons';

export default function Forbidden() {
  const t = useT();
  useDocumentTitle(t('errors.forbiddenTitle'));
  return (
    <StatusPage
      icon={Lock}
      eyebrow={t('errors.forbiddenEyebrow')}
      title={t('errors.forbiddenTitle')}
      actions={
        <>
          <ButtonLink to="/">{t('errors.goHome')}</ButtonLink>
          <ButtonLink to="/contact" variant="secondary">{t('common.contactUs')}</ButtonLink>
        </>
      }
    >
      {t('errors.forbiddenText')}
    </StatusPage>
  );
}
