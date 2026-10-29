import { useT } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { ButtonLink } from '../../components/ui';
import { StatusPage } from '../../components/ui/StatusPage';
import { Compass } from '../../components/ui/icons';

export default function NotFound() {
  const t = useT();
  useDocumentTitle(t('errors.notFoundTitle'));
  return (
    <StatusPage
      icon={Compass}
      eyebrow={t('errors.notFoundEyebrow')}
      title={t('errors.notFoundTitle')}
      actions={
        <>
          <ButtonLink to="/">{t('errors.goHome')}</ButtonLink>
          <ButtonLink to="/contact" variant="secondary">{t('common.contactUs')}</ButtonLink>
        </>
      }
    >
      {t('errors.notFoundText')}
    </StatusPage>
  );
}
