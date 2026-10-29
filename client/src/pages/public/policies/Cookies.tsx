import { useSite } from '../../../lib/site';
import { buildPolicies } from '../../../lib/policyText';
import { PolicyPage } from './PolicyPage';

// Describes what the site actually stores. Update it if a new cookie or storage key is added.

export default function Cookies() {
  const { site } = useSite();
  const draft = buildPolicies(site).cookies;
  return <PolicyPage slug="cookies" title="Cookies and storage" intro="The small amount of information this website keeps in your browser, and why." approved={site.policies.privacyApproved} draft={draft} />;
}
