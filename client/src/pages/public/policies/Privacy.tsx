import { useSite } from '../../../lib/site';
import { buildPolicies } from '../../../lib/policyText';
import { PolicyPage } from './PolicyPage';


export default function Privacy() {
  const { site } = useSite();
  const draft = buildPolicies(site).privacy;
  return <PolicyPage slug="privacy" title="Privacy notice" intro="How we collect, use and protect personal information, especially information about children." approved={site.policies.privacyApproved} draft={draft} />;
}
