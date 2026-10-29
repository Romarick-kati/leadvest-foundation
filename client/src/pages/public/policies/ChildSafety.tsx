import { useSite } from '../../../lib/site';
import { buildPolicies } from '../../../lib/policyText';
import { PolicyPage } from './PolicyPage';


export default function ChildSafety() {
  const { site } = useSite();
  const draft = buildPolicies(site).childSafety;
  return <PolicyPage slug="child-safety" title="Child safety and protection" intro="How we keep children safe on this website and in our activities." approved={site.policies.childSafetyApproved} draft={draft} />;
}
