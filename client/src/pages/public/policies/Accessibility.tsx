import { useSite } from '../../../lib/site';
import { buildPolicies } from '../../../lib/policyText';
import { PolicyPage } from './PolicyPage';

// Describes features that exist on the site today. No conformance level is claimed until an audit is done.

export default function Accessibility() {
  const { site } = useSite();
  const draft = buildPolicies(site).accessibility;
  return <PolicyPage slug="accessibility" title="Accessibility" intro="How we are making this website usable for everyone, and how to report a problem." approved={site.policies.privacyApproved} draft={draft} />;
}
