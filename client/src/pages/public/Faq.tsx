import { Plus } from '../../components/ui/icons';
import { Stagger } from '../../components/motion/Reveal';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { PageHeader, Section } from '../../components/layout/PageHeader';
import { SimpleMarkdown } from '../../components/content/SimpleMarkdown';

// Answers here describe how this website works. Questions about the foundation itself are
// added by administrators as a "faq" page in the dashboard once approved.
const websiteFaq = [
  { q: 'Do I need an account to use the website?', a: 'No. You can read about the foundation, browse programs and events, and use public learning activities without an account. An account is only needed to register for activities or to save a child’s progress.' },
  { q: 'Who can create an account?', a: 'Young people aged 16 and over, including young adults, can create their own account. Children under 16 get a learning account created by a parent or guardian, who also creates their own account first. Instructors and staff are invited by the foundation.' },
  { q: 'What information do you keep about my child?', a: 'Only a nickname, a username, an optional age range and which lessons they have completed. Nothing about your child is shown publicly.' },
  { q: 'Can my child talk to other people on the website?', a: 'No. There is no chat, messaging or comments feature anywhere on the website.' },
  { q: 'How do I keep my account secure?', a: 'Use a strong password and turn on two factor authentication in Settings, Security. You will then need a code from an authenticator app when you sign in.' },
  { q: 'My child forgot their password. What do I do?', a: 'Sign in to your parent account and open Settings, Family. You can set a new password for your child there.' },
  { q: 'Can I pay online?', a: 'Not yet. Where a program or event has a fee, the foundation will contact you with payment details.' },
];

export default function Faq() {
  useDocumentTitle('Questions and answers');
  const managed = useQuery({ queryKey: ['page', 'faq'], queryFn: () => api.get<{ title: string; body: string } | null>('/pages/faq'), retry: false });
  return (
    <>
      <PageHeader eyebrow="Help" title="Questions and answers">
        Quick answers to common questions. Cannot find what you need? <Link to="/contact">Contact us</Link>.
      </PageHeader>
      <Section>
        <Stagger className="mx-auto max-w-3xl space-y-12">
          {managed.data && (
            <section>
              <h2 className="text-h3">About the foundation</h2>
              <div className="mt-4"><SimpleMarkdown source={managed.data.body} /></div>
            </section>
          )}
          <section>
            <h2 className="text-h3">Using this website</h2>
            <div className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
              {websiteFaq.map((f) => (
                <details key={f.q} className="group p-5 transition-colors open:bg-blue-50/40">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-semibold text-heading [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition-transform duration-300 group-open:rotate-45"><Plus size={13} /></span>
                  </summary>
                  <p className="mt-3 text-ink">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </Stagger>
      </Section>
    </>
  );
}
