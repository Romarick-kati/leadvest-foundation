import { useSite } from '../../../lib/site';
import { buildPolicies } from '../../../lib/policyText';
import { PolicyPage } from './PolicyPage';


export default function Consent() {
  const { site } = useSite();
  const draft = buildPolicies(site).consent;
  return <PolicyPage slug="consent" title="Consent information" intro="What parents and guardians agree to, and how to change those choices." approved={site.policies.privacyApproved} draft={draft} />;
}
