import { Link } from 'react-router-dom';
import { Panel } from '../../components/ui';
import { AdminPage } from './shared';

const Row = ({ seen, where, how }: { seen: string; where: string; how: string }) => (
  <tr className="align-top">
    <td className="py-3 pr-4 font-semibold text-heading">{seen}</td>
    <td className="py-3 pr-4 text-ink">{where}</td>
    <td className="py-3 text-ink-muted">{how}</td>
  </tr>
);

const Steps = ({ items }: { items: string[] }) => (
  <ol className="list-decimal space-y-2 pl-5 text-ink">
    {items.map((s) => <li key={s}>{s}</li>)}
  </ol>
);

/** A guide inside the dashboard, so whoever runs the site (and whoever takes it over) can see how it all fits together. */
export default function HelpAdmin() {
  return (
    <AdminPage title="How this website works" description="Where everything on the website comes from, who does what, and the steps for the jobs you will do most.">
      <div className="space-y-6">
        <Panel title="The big picture">
          <p className="max-w-prose text-ink">
            The website has two sides. Visitors see the <strong>public site</strong>. You, signed in as an administrator, use this <strong>dashboard</strong> to change it. Almost everything visitors read is typed here, so no one needs to touch code to post an event, add a program or update a policy. Nothing you publish is visible until you set it to <strong>Published</strong>.
          </p>
        </Panel>

        <Panel title="What visitors see, and where you change it">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead><tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted"><th className="pb-2 pr-4">On the website</th><th className="pb-2 pr-4">Change it here</th><th className="pb-2">How</th></tr></thead>
              <tbody className="divide-y divide-line">
                <Row seen="Programs (the sliding cards on the home page and the Programs page)" where="Content › Programs" how="New program, fill the title and summary, set Visibility to Published. It appears by itself." />
                <Row seen="Upcoming events and activities" where="Content › Events" how="New event with date and place, set Published. Switch Registration open on to take sign ups. Past events move to the past list by themselves." />
                <Row seen="The strip of photos that glides across the home page, and the gallery on the About page" where="Content › Media" how="Upload a photo into the folder called gallery and write a short description of it. Large photos are fine; they are resized." />
                <Row seen="Lessons, quizzes and badges (the Learning area)" where="Content › Learning" how="New module, add lessons and quiz questions, set Published." />
                <Row seen="News and helpful reading (Resources)" where="Content › Articles" how="New article, write it, set Published." />
                <Row seen="Numbers like “young people reached”" where="Settings › Impact figures" how="Only enter numbers you can prove. The section stays hidden while empty." />
                <Row seen="Contact details, WhatsApp button, social links, address" where="Settings › Contact" how="Type them in and save." />
                <Row seen="Logo" where="Settings › Branding" how="Upload in Media (folder branding), paste the link, save." />
                <Row seen="Privacy, Terms, Child safety, Consent, Cookies" where="Settings › Legal details" how="Answer the questions, save, then read each page and switch it to approved. Details below." />
                <Row seen="The big words at the top of the home page" where="In the website code" how="These few words are not edited here. Ask the developer to change them." />
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Post an event or activity">
          <Steps items={[
            'Open Content › Events and press New event.',
            'Write the title, a short summary, the date, time and place. Add a photo if you have one.',
            'Choose Registration open if people should sign up. Leave it off for information only.',
            'Set Visibility to Published and save. Press “View live page” to check it.',
            'To hide it again later, set Visibility back to Draft. To cancel it, set Event status to Cancelled so people see why.',
          ]} />
        </Panel>

        <Panel title="Add a program (it joins the sliding cards)">
          <Steps items={[
            'Open Content › Programs and press New program.',
            'Fill in the title, a short summary, who it is for and what it covers. Add the price only if it is paid.',
            'Set Visibility to Published and save. It now appears on the home page and on the Programs page.',
          ]} />
        </Panel>

        <Panel title="Who does what">
          <ul className="list-disc space-y-2 pl-5 text-ink">
            <li><strong>Administrator</strong> (you and the director): everything in this dashboard. Invite more admins from People › Users › Invite someone.</li>
            <li><strong>Instructor</strong>: sees only the children registered in their own programs. Invite from People › Instructors.</li>
            <li><strong>Young person (16 and over)</strong>: signs up alone, pays the access fee, uses the learning area.</li>
            <li><strong>Parent or guardian</strong>: signs up, pays once, adds their children (under 16) and registers them for programs.</li>
            <li><strong>Child</strong>: has an account made by a parent. Cannot sign up alone and has no chat.</li>
          </ul>
        </Panel>

        <Panel title="Policies and terms: who writes them, and how">
          <p className="mb-3 max-w-prose text-ink">
            <strong>The director (Neville)</strong> decides the facts: the legal name, how long data is kept, who the safeguarding lead is, the refund rules. <strong>You</strong> type them in. <strong>A lawyer</strong> in your country should read the finished pages once. The website writes the legal wording itself from those answers.
          </p>
          <Steps items={[
            'Open Settings › Legal details. A yellow box lists what is still missing.',
            'Fill the fields. Also fill Contact (email, address) in Settings.',
            'Save, then open the pages from the footer (Privacy, Terms, Child safety, Consent, Cookies). Any highlighted gap tells you what to add.',
            'When the director and the lawyer are happy, go to Settings › Policies and switch the approval toggles on. The “waiting for approval” notice disappears.',
            'Want to write a page in your own words instead? Content › Pages: create a page with the web address privacy (or terms, child-safety, consent, cookies) and publish it. It replaces the automatic one.',
          ]} />
        </Panel>

        <Panel title="Money">
          <ul className="list-disc space-y-2 pl-5 text-ink">
            <li>People pay the access fee on the secure page of Fapshi (mobile money) or Flutterwave (cards worldwide). You see every payment in Money › Payments. The cash itself is in your Fapshi and Flutterwave dashboards.</li>
            <li>The price and period are set by the developer in the hosting settings (ACCESS_FEE_XAF, ACCESS_FEE_USD, ACCESS_PERIOD_DAYS), then the site is redeployed.</li>
            <li>Give someone free access (scholarship, partner, tester): People › Users › open the person › Paid access.</li>
          </ul>
        </Panel>

        <Panel title="Passwords, new admins and handing over">
          <Steps items={[
            'Change your own password: avatar menu › Settings › Account. Keep two factor sign in on and store the recovery codes safely.',
            'Change your email: the same page.',
            'To add the director as an administrator: People › Users › Invite someone, role Administrator. He receives a link to choose his own password.',
            'When he has signed in and set up two factor, you can change your own role or remove your account.',
          ]} />
        </Panel>

        <Panel title="When you buy the domain name">
          <Steps items={[
            'Netlify › Domain management › Add a domain. Follow its steps to point the domain at the site (they give you the records to copy at the place you bought it).',
            'In Netlify variables set PUBLIC_APP_URL to https://your-domain and redeploy.',
            'In Google Cloud Console add https://your-domain/api/auth/google/callback to the authorised redirect addresses of your sign in client.',
            'In Fapshi and Flutterwave change the webhook address to https://your-domain/api/payments/webhooks/fapshi (or flutterwave).',
            'In Google Search Console add your domain, verify it, and submit https://your-domain/sitemap.xml so Google finds your pages.',
          ]} />
        </Panel>

        <p className="text-sm text-ink-muted">More detail for the developer is in HOW_TO_RUN.md. <Link to="/admin/settings">Open Settings</Link></p>
      </div>
    </AdminPage>
  );
}
