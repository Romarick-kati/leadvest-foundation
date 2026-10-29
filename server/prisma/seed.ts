/**
 * DEVELOPMENT SAMPLE DATA ONLY.
 * Every record is fictional and flagged isSample so it can be found and removed.
 * No real children, staff, partners or foundation details are used. Refuses to run in production.
 *
 * --content-only creates just the sample programs, events and lessons, with no accounts and
 * no known passwords. It is allowed on a hosted test site (SEED_SAMPLE_CONTENT=true on Netlify).
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

const contentOnly = process.argv.includes('--content-only');

if (process.env.NODE_ENV === 'production' && !contentOnly) {
  console.error('Refusing to seed sample data in production.');
  process.exit(1);
}

const DEV_PASSWORD = 'DevOnly-password-123';

async function sampleAccounts() {
  const passwordHash = await hash(DEV_PASSWORD);
  const user = (email: string, displayName: string, role: 'ADMIN' | 'INSTRUCTOR' | 'PARENT') =>
    prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, displayName, role, passwordHash, emailVerifiedAt: new Date(), preferences: { create: {} } },
    });

  const admin = await user('admin@example.test', 'Sample Administrator', 'ADMIN');
  const instructor = await user('instructor@example.test', 'Sample Instructor', 'INSTRUCTOR');
  const otherInstructor = await user('instructor2@example.test', 'Second Sample Instructor', 'INSTRUCTOR');
  const parent = await user('parent@example.test', 'Sample Parent', 'PARENT');

  const learner = await prisma.user.upsert({
    where: { username: 'sample_learner' },
    update: {},
    create: {
      username: 'sample_learner',
      displayName: 'Sam',
      role: 'LEARNER',
      passwordHash,
      createdById: parent.id,
      preferences: { create: {} },
      learnerProfile: { create: { ageBand: '7-9' } },
    },
  });
  await prisma.guardianLink.upsert({
    where: { guardianId_learnerId: { guardianId: parent.id, learnerId: learner.id } },
    update: {},
    create: { guardianId: parent.id, learnerId: learner.id, relationship: 'parent', status: 'VERIFIED', verifiedAt: new Date() },
  });

  return { admin, instructor, otherInstructor, parent, learner };
}

async function main() {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const accounts = contentOnly ? null : await sampleAccounts();

  const programA = await prisma.program.upsert({
    where: { slug: 'sample-young-leaders-circle' },
    update: {},
    create: {
      slug: 'sample-young-leaders-circle',
      title: 'Sample program: Young Leaders Circle',
      summary: 'Placeholder program used to preview the layout. Replace with an approved program description.',
      description:
        'This is sample text for development only. It shows how a program description, objectives, schedule and frequently asked questions will appear once the foundation supplies approved details.',
      objectives: ['Placeholder objective one', 'Placeholder objective two', 'Placeholder objective three'],
      deliveryFormat: 'In person',
      availability: 'Sample availability',
      schedule: 'To be confirmed',
      duration: 'To be confirmed',
      registrationOpen: true,
      faq: [{ question: 'Sample question?', answer: 'Sample answer to preview the FAQ layout.' }],
      status: 'PUBLISHED',
      isSample: true,
    },
  });
  const programB = await prisma.program.upsert({
    where: { slug: 'sample-reading-and-reflection' },
    update: {},
    create: {
      slug: 'sample-reading-and-reflection',
      title: 'Sample program: Reading and Reflection',
      summary: 'Second placeholder program, also for layout preview only.',
      description: 'Sample text for development only.',
      objectives: ['Placeholder objective'],
      deliveryFormat: 'Online',
      status: 'PUBLISHED',
      isSample: true,
    },
  });
  if (accounts) {
    await prisma.instructorAssignment.upsert({
      where: { programId_instructorId: { programId: programA.id, instructorId: accounts.instructor.id } },
      update: {},
      create: { programId: programA.id, instructorId: accounts.instructor.id },
    });
    await prisma.instructorAssignment.upsert({
      where: { programId_instructorId: { programId: programB.id, instructorId: accounts.otherInstructor.id } },
      update: {},
      create: { programId: programB.id, instructorId: accounts.otherInstructor.id },
    });
  }

  await prisma.event.upsert({
    where: { slug: 'sample-family-open-day' },
    update: {},
    create: {
      slug: 'sample-family-open-day',
      title: 'Sample event: Family open day',
      summary: 'Placeholder event to preview listings and registration. Not a real event.',
      description: 'Sample text for development only. Replace with approved event information.',
      startsAt: new Date(now + 21 * day),
      endsAt: new Date(now + 21 * day + 3 * 60 * 60 * 1000),
      locationType: 'IN_PERSON',
      location: 'Venue to be confirmed',
      audience: 'Families',
      capacity: 30,
      registrationOpen: true,
      registrationDeadline: new Date(now + 18 * day),
      status: 'PUBLISHED',
      isSample: true,
    },
  });
  await prisma.event.upsert({
    where: { slug: 'sample-online-storytime' },
    update: {},
    create: {
      slug: 'sample-online-storytime',
      title: 'Sample event: Online story session',
      summary: 'Placeholder online event with a sample price to exercise the simulated payment flow.',
      description: 'Sample text for development only.',
      startsAt: new Date(now + 35 * day),
      locationType: 'ONLINE',
      capacity: 50,
      registrationOpen: true,
      priceCents: 100000,
      currency: 'XAF',
      status: 'PUBLISHED',
      isSample: true,
    },
  });

  const mod = await prisma.learningModule.upsert({
    where: { slug: 'sample-working-together' },
    update: {},
    create: {
      slug: 'sample-working-together',
      title: 'Working together',
      description: 'Sample topic to preview the learning area. Replace with approved lessons.',
      theme: 'sky',
      icon: 'compass',
      status: 'PUBLISHED',
      sortOrder: 1,
      isSample: true,
    },
  });
  await prisma.lesson.upsert({
    where: { moduleId_slug: { moduleId: mod.id, slug: 'listening-well' } },
    update: {},
    create: {
      moduleId: mod.id,
      slug: 'listening-well',
      title: 'Listening well',
      minutes: 5,
      sortOrder: 1,
      content: [
        { type: 'text', text: 'Good leaders listen carefully. When someone is talking, look at them and let them finish.' },
        { type: 'tip', text: 'Try counting to two in your head before you answer. It gives you time to think.' },
        { type: 'activity', title: 'Try it', text: 'Ask someone at home about their day, and listen without interrupting.' },
      ],
      quiz: [
        { prompt: 'What can you do to show you are listening?', options: ['Look at the person talking', 'Talk over them', 'Walk away'], answerIndex: 0, explanation: 'Looking at someone shows them you care about what they say.' },
        { prompt: 'When should you start talking?', options: ['Straight away', 'When they have finished', 'Never'], answerIndex: 1 },
      ],
    },
  });
  await prisma.lesson.upsert({
    where: { moduleId_slug: { moduleId: mod.id, slug: 'sharing-ideas' } },
    update: {},
    create: {
      moduleId: mod.id,
      slug: 'sharing-ideas',
      title: 'Sharing ideas',
      minutes: 5,
      sortOrder: 2,
      content: [
        { type: 'text', text: 'Everyone in a team has ideas. A good team gives every person a turn.' },
        { type: 'tip', text: 'You can say: "That is a good idea. Can I add something?"' },
      ],
      quiz: [{ prompt: 'Who should get a turn to share?', options: ['Only the oldest', 'Everyone', 'Only the leader'], answerIndex: 1 }],
    },
  });

  const mod2 = await prisma.learningModule.upsert({
    where: { slug: 'sample-being-kind' },
    update: {},
    create: {
      slug: 'sample-being-kind',
      title: 'Being kind',
      description: 'Another sample topic for the learning area preview.',
      theme: 'mint',
      icon: 'heart',
      status: 'PUBLISHED',
      sortOrder: 2,
      isSample: true,
    },
  });
  await prisma.lesson.upsert({
    where: { moduleId_slug: { moduleId: mod2.id, slug: 'small-acts' } },
    update: {},
    create: {
      moduleId: mod2.id,
      slug: 'small-acts',
      title: 'Small acts of kindness',
      minutes: 4,
      sortOrder: 1,
      content: [{ type: 'text', text: 'Kindness can be small: holding a door, sharing a pencil, or saying thank you.' }],
      quiz: [],
    },
  });

  // Sample articles: placeholders that show the resources layout until real articles are written.
  const sampleArticles = [
    { slug: 'sample-reading-together', title: 'Sample article: Reading together at home', category: 'parenting', imageKey: 'home.families', readMinutes: 3,
      summary: 'Placeholder article used to preview the resources section. Replace it with an article written or approved by the foundation.',
      body: 'This is a **sample article** created by the development seed.\n\n## Why this is here\n\nIt shows how articles look on the website. Administrators can edit or delete it from Dashboard > Articles.\n\n- Short paragraphs\n- Clear headings\n- Practical tips' },
    { slug: 'sample-first-steps-online-learning', title: 'Sample article: First steps with online learning', category: 'digital', imageKey: 'digital.main', readMinutes: 4,
      summary: 'Second placeholder article, also for layout preview only.',
      body: 'This is a **sample article**. Replace it with real guidance before launch.' },
    { slug: 'sample-what-makes-a-good-mentor', title: 'Sample article: What makes a good mentor', category: 'leadership', imageKey: 'mentoring.main', readMinutes: 5,
      summary: 'Third placeholder article for previewing categories and cards.',
      body: 'This is a **sample article**. Replace it with real guidance before launch.' },
  ] as const;
  for (const [i, a] of sampleArticles.entries()) {
    await prisma.article.upsert({
      where: { slug: a.slug },
      update: {},
      create: { ...a, status: 'PUBLISHED', isSample: true, publishedAt: new Date(now - (i + 1) * day) },
    });
  }

  if (contentOnly) {
    console.log('\nSample programs, events and lessons created. No accounts were created.\n');
    return;
  }

  if ((await prisma.enquiry.count()) === 0) await prisma.enquiry.create({
    data: { category: 'general', name: 'Sample Visitor', email: 'visitor@example.test', subject: 'Sample enquiry', message: 'This is a fictional enquiry created by the development seed.' },
  });

  console.log('\nSample data created (development only).');
  console.log('All sample accounts use the password:', DEV_PASSWORD);
  console.log('  admin@example.test        administrator (you will be asked to set up two factor authentication)');
  console.log('  instructor@example.test   instructor assigned to the first sample program');
  console.log('  parent@example.test       parent with one learner');
  console.log('  sample_learner            learner (username sign in)\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
