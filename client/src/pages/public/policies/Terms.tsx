import { useSite } from '../../../lib/site';
import { buildPolicies } from '../../../lib/policyText';
import { PolicyPage } from './PolicyPage';


export default function Terms() {
  const { site } = useSite();
  const draft = buildPolicies(site).terms;
  return <PolicyPage slug="terms" title="Website terms" intro="The terms for using this website and its accounts." approved={site.policies.termsApproved} draft={draft} />;
}
