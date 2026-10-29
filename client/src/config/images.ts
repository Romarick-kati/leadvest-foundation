/**
 * Central image registry. Components ask for an image by key, so replacing an image
 * means editing one line here, not hunting through pages.
 *
 * While src is null an illustration in the site's style is shown at the same aspect ratio.
 * To use a photo:
 *   1. Put the original (JPEG or PNG, at least 1600 px wide) in client/images-src/.
 *   2. Run `npm run images --workspace client`. It writes WebP files in three widths to
 *      public/images/photos/ and prints the src and srcSet to paste below.
 *   3. Set src, srcSet and a meaningful alt text, and credit the photographer in
 *      public/images/CREDITS.md if the licence asks for it.
 *
 * Never add identifiable photos of children without documented guardian permission and
 * foundation approval. Private or sensitive images do not belong in public/.
 */
export interface ImageEntry {
  src: string | null;
  srcSet?: string;
  alt: string;
  /** width / height */
  ratio: number;
  /** Illustration shown while no photo is set, or if the photo fails to load. */
  scene: 'growth' | 'books' | 'team' | 'stars' | 'community' | 'path' | 'workshop' | 'mentor' | 'event';
  label: string;
}

/**
 * Photos supplied by the site owner, who confirmed permission to use them (23 October 2026).
 * Optimised copies live in public/images/photos/; originals are in client/images-src/.
 * Several show other organisations' programmes, so alt text describes only what is visible
 * and nothing presents them as the foundation's own activities. See public/images/CREDITS.md.
 */
const P = '/images/photos/';
const photo = {
  adultsAndChildrenDrawing: { src: `${P}adults-and-children-drawing-473.webp`, srcSet: `${P}adults-and-children-drawing-473.webp 473w` },
  audienceAtTalk: { src: `${P}audience-at-talk-735.webp`, srcSet: `${P}audience-at-talk-640.webp 640w, ${P}audience-at-talk-735.webp 735w` },
  childrenInClassroom: { src: `${P}children-in-classroom-736.webp`, srcSet: `${P}children-in-classroom-640.webp 640w, ${P}children-in-classroom-736.webp 736w` },
  groupPlanningSession: { src: `${P}group-planning-session-736.webp`, srcSet: `${P}group-planning-session-640.webp 640w, ${P}group-planning-session-736.webp 736w` },
  mentorWithStudents: { src: `${P}mentor-with-students-668.webp`, srcSet: `${P}mentor-with-students-640.webp 640w, ${P}mentor-with-students-668.webp 668w` },
  onlineClassVideo: { src: `${P}online-class-video-735.webp`, srcSet: `${P}online-class-video-640.webp 640w, ${P}online-class-video-735.webp 735w` },
  onlineStudyNotes: { src: `${P}online-study-notes-735.webp`, srcSet: `${P}online-study-notes-640.webp 640w, ${P}online-study-notes-735.webp 735w` },
  outdoorGroupSession: { src: `${P}outdoor-group-session-736.webp`, srcSet: `${P}outdoor-group-session-640.webp 640w, ${P}outdoor-group-session-736.webp 736w` },
  studentsInCourtyard: { src: `${P}students-in-courtyard-735.webp`, srcSet: `${P}students-in-courtyard-640.webp 640w, ${P}students-in-courtyard-735.webp 735w` },
  teacherAtWhiteboard: { src: `${P}teacher-at-whiteboard-736.webp`, srcSet: `${P}teacher-at-whiteboard-640.webp 640w, ${P}teacher-at-whiteboard-736.webp 736w` },
  teacherHelpingAtLaptop: { src: `${P}teacher-helping-at-laptop-612.webp`, srcSet: `${P}teacher-helping-at-laptop-612.webp 612w` },
  teacherSmallGroup: { src: `${P}teacher-small-group-627.webp`, srcSet: `${P}teacher-small-group-627.webp 627w` },
  youngAdultsStudying: { src: `${P}young-adults-studying-736.webp`, srcSet: `${P}young-adults-studying-640.webp 640w, ${P}young-adults-studying-736.webp 736w` },
  youngPeopleStudyGroup: { src: `${P}young-people-study-group-736.webp`, srcSet: `${P}young-people-study-group-640.webp 640w, ${P}young-people-study-group-736.webp 736w` },
  youthWorkshopTable: { src: `${P}youth-workshop-table-735.webp`, srcSet: `${P}youth-workshop-table-640.webp 640w, ${P}youth-workshop-table-735.webp 735w` },
} as const;

export const images = {
  'home.hero': { ...photo.teacherAtWhiteboard, alt: 'A teacher at a whiteboard while children in school uniform raise their hands', ratio: 5 / 4, scene: 'team', label: 'Homepage hero image' },
  'home.approach': { ...photo.teacherSmallGroup, alt: 'A teacher talking with a small group of students around a table', ratio: 4 / 3, scene: 'workshop', label: 'Our approach image' },
  'home.families': { ...photo.adultsAndChildrenDrawing, alt: 'Adults and young people sitting together outdoors, drawing on paper', ratio: 4 / 3, scene: 'books', label: 'Families image' },
  'home.involved': { ...photo.mentorWithStudents, alt: 'A mentor showing a group of students how something works', ratio: 4 / 3, scene: 'mentor', label: 'Get involved image' },
  'about.main': { ...photo.studentsInCourtyard, alt: 'A large group of students waving together in a school courtyard', ratio: 16 / 9, scene: 'community', label: 'About page image' },
  'programs.main': { ...photo.groupPlanningSession, alt: 'Young women planning together around a table covered in notes', ratio: 4 / 3, scene: 'workshop', label: 'Programs page image' },
  'events.main': { ...photo.audienceAtTalk, alt: 'An audience listening closely to a speaker', ratio: 4 / 3, scene: 'event', label: 'Events page image' },
  'learning.main': { ...photo.teacherHelpingAtLaptop, alt: 'A teacher helping students with work on a laptop', ratio: 4 / 3, scene: 'books', label: 'Learning area image' },
  'program.default': { ...photo.youngPeopleStudyGroup, alt: '', ratio: 3 / 2, scene: 'growth', label: 'Program image' },
  'event.default': { ...photo.outdoorGroupSession, alt: '', ratio: 16 / 9, scene: 'event', label: 'Event image' },
  'parents.main': { ...photo.childrenInClassroom, alt: 'Smiling children gathered together in a classroom', ratio: 4 / 3, scene: 'books', label: 'Parents page image' },
  'involved.main': { ...photo.youthWorkshopTable, alt: 'Young people talking in small groups at a workshop', ratio: 4 / 3, scene: 'mentor', label: 'Get involved page image' },
  'donate.main': { ...photo.outdoorGroupSession, alt: 'A group of young people sitting in a circle on a lawn, listening to a speaker', ratio: 4 / 3, scene: 'growth', label: 'Donations page image' },
  'auth.side': { ...photo.youngPeopleStudyGroup, alt: 'Young people working together around a table by a bright window', ratio: 4 / 5, scene: 'workshop', label: 'Sign in page image' },
  'contact.main': { ...photo.youngAdultsStudying, alt: 'Young adults reading and taking notes together', ratio: 4 / 3, scene: 'mentor', label: 'Contact page image' },
  'mentoring.main': { ...photo.youngAdultsStudying, alt: 'Young adults reading and taking notes together', ratio: 4 / 3, scene: 'mentor', label: 'Mentoring image' },
  'digital.main': { ...photo.onlineClassVideo, alt: 'A learner following an online class on a laptop', ratio: 3 / 2, scene: 'books', label: 'Digital learning image' },
  'resources.main': { ...photo.onlineStudyNotes, alt: 'Someone taking notes while studying online', ratio: 3 / 2, scene: 'books', label: 'Resources page image' },
  'article.default': { ...photo.onlineStudyNotes, alt: '', ratio: 16 / 9, scene: 'books', label: 'Article image' },
  'community.main': { ...photo.outdoorGroupSession, alt: 'A group of young people sitting in a circle on a lawn, listening to a speaker', ratio: 4 / 3, scene: 'community', label: 'Community outreach image' },
} satisfies Record<string, ImageEntry>;

export type ImageKey = keyof typeof images;

/** Distinct photos in the registry, for the moving photo strips. */
export const registryPhotos: { src: string; srcSet?: string; alt: string }[] = Object.values(photo).flatMap((p) => {
  const used = (Object.values(images) as ImageEntry[]).find((e) => e.src === p.src && e.alt);
  return used ? [{ src: p.src, srcSet: p.srcSet, alt: used.alt }] : [];
});

/** Resolves a key stored in the database (programs, events) or falls back to a default. */
export function resolveImage(key: string | null | undefined, fallback: ImageKey): ImageEntry {
  if (key && key in images) return images[key as ImageKey];
  if (key && (key.startsWith('/') || key.startsWith('https://'))) return { ...images[fallback], src: key };
  return images[fallback];
}
