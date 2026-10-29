import { useNavigate } from 'react-router-dom';
import { useT } from '../../i18n';
import { LayoutDashboard, LogOut, Settings, User as UserIcon, BookOpen, Users } from '../ui/icons';
import { useAuth } from '../../lib/auth';
import { Avatar, Dropdown, type DropdownItem } from '../ui';

export function AccountMenu() {
  const t = useT();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const items: DropdownItem[] = [];
  if (user.role === 'ADMIN') items.push({ label: t('nav.dashboard'), to: '/admin', icon: <LayoutDashboard size={16} /> });
  if (user.role === 'INSTRUCTOR') items.push({ label: t('nav.myPrograms'), to: '/instructor', icon: <Users size={16} /> });
  if (user.role === 'MEMBER') items.push({ label: t('nav.chooseRole'), to: '/welcome', icon: <UserIcon size={16} /> });
  if (user.role === 'PARENT' || user.role === 'YOUTH') items.push({ label: t('nav.myAccount'), to: '/account', icon: <UserIcon size={16} /> });
  if (user.role === 'LEARNER' || user.role === 'YOUTH') items.push({ label: t('nav.myLearning'), to: '/learning', icon: <BookOpen size={16} /> });
  items.push({ label: t('nav.settings'), to: '/settings', icon: <Settings size={16} /> });
  items.push({
    label: t('common.signOut'),
    icon: <LogOut size={16} />,
    danger: true,
    onSelect: async () => {
      await signOut();
      navigate('/', { replace: true });
    },
  });
  return (
    <Dropdown
      label={t('nav.accountMenu', { name: user.displayName })}
      items={items}
      trigger={
        <span className="flex items-center rounded-full border-2 border-transparent transition-colors hover:border-blue">
          <Avatar name={user.displayName} src={user.avatarUrl} size={40} />
        </span>
      }
    />
  );
}
