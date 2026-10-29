import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LazyMotion } from 'framer-motion';
import { AuthProvider } from './lib/auth';
import { PreferencesProvider } from './lib/preferences';
import { I18nProvider } from './i18n';
import { PageLoader, ToastProvider } from './components/ui';
import { PublicLayout } from './components/layout/PublicLayout';
import { RequireAuth } from './components/layout/Guards';
import { ApiError } from './lib/api';
import Home from './pages/public/Home';
// The main visitor pages ship with the first bundle so they paint without a second round trip
// on slow phone connections. Everything else is split by route.
import About from './pages/public/About';
import Programs from './pages/public/Programs';
import Events from './pages/public/Events';
import Parents from './pages/public/Parents';
import GetInvolved from './pages/public/GetInvolved';
import Contact from './pages/public/Contact';
import { RouteError } from './pages/public/RouteError';

// Animation code loads after the first render, so it never delays the page appearing.
const loadMotionFeatures = () => import('./lib/motionFeatures').then((mod) => mod.default);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, err) => !(err instanceof ApiError && ((err.status >= 400 && err.status < 500) || err.code === 'api_unavailable')) && count < 2,
      staleTime: 10_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

// Route level code splitting keeps the first load small; admin and settings load on demand.
/** Public pages are fetched quietly in the background after the first page shows, so moving around feels instant. */
const warmUp: Array<() => Promise<unknown>> = [];
const pagePublic = (loader: () => Promise<{ default: ComponentType }>) => {
  warmUp.push(loader);
  return page(loader);
};
if (typeof window !== 'undefined') {
  const run = () => warmUp.forEach((l, i) => window.setTimeout(() => { l().catch(() => undefined); }, i * 150));
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (!conn?.saveData) window.addEventListener('load', () => (typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(run, { timeout: 4000 }) : setTimeout(run, 2500)), { once: true });
}

const page = (loader: () => Promise<{ default: ComponentType }>) => {
  // After a new release an open tab can still ask for an old file. Reload once to pick up the new one.
  const C = lazy(() =>
    loader().catch((err) => {
      const key = 'lvf-chunk-reload';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        return new Promise<never>(() => undefined);
      }
      sessionStorage.removeItem(key);
      throw err;
    }),
  );
  return <C />;
};

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/about', element: <About /> },
      { path: '/programs', element: <Programs /> },
      { path: '/programs/:slug', element: pagePublic(() => import('./pages/public/ProgramDetail')) },
      { path: '/events', element: <Events /> },
      { path: '/events/:slug', element: pagePublic(() => import('./pages/public/EventDetail')) },
      { path: '/parents', element: <Parents /> },
      { path: '/resources', element: pagePublic(() => import('./pages/public/resources/Resources')) },
      { path: '/resources/:slug', element: pagePublic(() => import('./pages/public/resources/ArticleDetail')) },
      { path: '/get-involved', element: <GetInvolved /> },
      { path: '/support', element: pagePublic(() => import('./pages/public/Support')) },
      { path: '/contact', element: <Contact /> },
      { path: '/faq', element: pagePublic(() => import('./pages/public/Faq')) },
      { path: '/privacy', element: pagePublic(() => import('./pages/public/policies/Privacy')) },
      { path: '/child-safety', element: pagePublic(() => import('./pages/public/policies/ChildSafety')) },
      { path: '/terms', element: pagePublic(() => import('./pages/public/policies/Terms')) },
      { path: '/consent', element: pagePublic(() => import('./pages/public/policies/Consent')) },
      { path: '/cookies', element: pagePublic(() => import('./pages/public/policies/Cookies')) },
      { path: '/accessibility', element: pagePublic(() => import('./pages/public/policies/Accessibility')) },
      { path: '/learning', element: page(() => import('./pages/learn/LearningHome')) },
      { path: '/learning/:moduleSlug', element: page(() => import('./pages/learn/ModulePage')) },
      { path: '/learning/:moduleSlug/:lessonSlug', element: page(() => import('./pages/learn/LessonPage')) },
      { path: '/sign-in', element: page(() => import('./pages/auth/SignIn')) },
      { path: '/setup', element: page(() => import('./pages/auth/FirstAdminSetup')) },
      { path: '/sign-in/verify', element: page(() => import('./pages/auth/TwoFactorChallenge')) },
      { path: '/sign-in/complete', element: page(() => import('./pages/auth/Google')) },
      { path: '/register', element: page(() => import('./pages/auth/Register')) },
      { path: '/forgot-password', element: page(() => import('./pages/auth/ForgotPassword')) },
      { path: '/reset-password', element: page(() => import('./pages/auth/ResetPassword')) },
      { path: '/verify-email', element: page(() => import('./pages/auth/VerifyEmail')) },
      { path: '/payments/simulated/:paymentId', element: <RequireAuth roles={['PARENT', 'YOUTH']}>{page(() => import('./pages/account/SimulatedPayment'))}</RequireAuth> },
      { path: '/subscribe', element: <RequireAuth roles={['PARENT', 'YOUTH', 'LEARNER']}>{page(() => import('./pages/account/Subscribe'))}</RequireAuth> },
      { path: '/payment/return', element: <RequireAuth roles={['PARENT', 'YOUTH', 'MEMBER']}>{page(() => import('./pages/account/PaymentReturn'))}</RequireAuth> },
      { path: '/welcome', element: <RequireAuth roles={['MEMBER', 'PARENT', 'YOUTH']}>{page(() => import('./pages/auth/Welcome'))}</RequireAuth> },
      { path: '/account', element: <RequireAuth roles={['PARENT', 'YOUTH']}>{page(() => import('./pages/account/AccountHome'))}</RequireAuth> },
      { path: '/instructor', element: <RequireAuth roles={['INSTRUCTOR', 'ADMIN']}>{page(() => import('./pages/account/InstructorHome'))}</RequireAuth> },
      {
        path: '/settings',
        element: <RequireAuth>{page(() => import('./pages/settings/SettingsLayout'))}</RequireAuth>,
        children: [
          { index: true, element: <Navigate to="profile" replace /> },
          { path: 'profile', element: page(() => import('./pages/settings/ProfileSettings')) },
          { path: 'account', element: page(() => import('./pages/settings/AccountSettings')) },
          { path: 'security', element: page(() => import('./pages/settings/SecuritySettings')) },
          { path: 'privacy', element: page(() => import('./pages/settings/PrivacySettings')) },
          { path: 'notifications', element: page(() => import('./pages/settings/NotificationSettings')) },
          { path: 'appearance', element: page(() => import('./pages/settings/AppearanceSettings')) },
          { path: 'accessibility', element: page(() => import('./pages/settings/AccessibilitySettings')) },
          { path: 'learning', element: page(() => import('./pages/settings/LearningSettings')) },
          { path: 'family', element: page(() => import('./pages/settings/FamilySettings')) },
        ],
      },
      { path: '/forbidden', element: pagePublic(() => import('./pages/public/Forbidden')) },
      { path: '*', element: pagePublic(() => import('./pages/public/NotFound')) },
    ],
  },
  {
    path: '/admin',
    errorElement: <RouteError />,
    element: <RequireAuth roles={['ADMIN']}>{page(() => import('./pages/admin/AdminLayout'))}</RequireAuth>,
    children: [
      { index: true, element: page(() => import('./pages/admin/Overview')) },
      { path: 'pages', element: page(() => import('./pages/admin/PagesAdmin')) },
      { path: 'programs', element: page(() => import('./pages/admin/ProgramsAdmin')) },
      { path: 'programs/:id', element: page(() => import('./pages/admin/ProgramEditor')) },
      { path: 'learning', element: page(() => import('./pages/admin/LearningAdmin')) },
      { path: 'articles', element: page(() => import('./pages/admin/ArticlesAdmin')) },
      { path: 'articles/:id', element: page(() => import('./pages/admin/ArticleEditor')) },
      { path: 'learning/:id', element: page(() => import('./pages/admin/ModuleEditor')) },
      { path: 'events', element: page(() => import('./pages/admin/EventsAdmin')) },
      { path: 'events/:id', element: page(() => import('./pages/admin/EventEditor')) },
      { path: 'registrations', element: page(() => import('./pages/admin/RegistrationsAdmin')) },
      { path: 'enquiries', element: page(() => import('./pages/admin/EnquiriesAdmin')) },
      { path: 'users', element: page(() => import('./pages/admin/UsersAdmin')) },
      { path: 'announcements', element: page(() => import('./pages/admin/AnnouncementsAdmin')) },
      { path: 'users/:id', element: page(() => import('./pages/admin/UserDetail')) },
      { path: 'instructors', element: page(() => import('./pages/admin/InstructorsAdmin')) },
      { path: 'guardians', element: page(() => import('./pages/admin/GuardiansAdmin')) },
      { path: 'payments', element: page(() => import('./pages/admin/PaymentsAdmin')) },
      { path: 'media', element: page(() => import('./pages/admin/MediaAdmin')) },
      { path: 'reports', element: page(() => import('./pages/admin/ReportsAdmin')) },
      { path: 'privacy', element: page(() => import('./pages/admin/DataRequestsAdmin')) },
      { path: 'settings', element: page(() => import('./pages/admin/SettingsAdmin')) },
      { path: 'audit', element: page(() => import('./pages/admin/AuditAdmin')) },
      { path: 'help', element: page(() => import('./pages/admin/HelpAdmin')) },
    ],
  },
]);

export function App() {
  return (
    <LazyMotion features={loadMotionFeatures} strict>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PreferencesProvider>
          <I18nProvider>
            <ToastProvider>
              <Suspense fallback={<PageLoader />}>
                <RouterProvider router={router} />
              </Suspense>
            </ToastProvider>
          </I18nProvider>
        </PreferencesProvider>
      </AuthProvider>
    </QueryClientProvider>
    </LazyMotion>
  );
}
