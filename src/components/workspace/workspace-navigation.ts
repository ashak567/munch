export interface NavigationItem {
  id: 'home' | 'journal' | 'companion' | 'settings';
  label: string;
  iconName: 'Home' | 'BookOpen' | 'MessageSquare' | 'User';
  href: string;
}

export const WORKSPACE_NAVIGATION_CONFIG: NavigationItem[] = [
  {
    id: 'home',
    label: 'Home',
    iconName: 'Home',
    href: '/dashboard'
  },
  {
    id: 'journal',
    label: 'Journal',
    iconName: 'BookOpen',
    href: '/history'
  },
  {
    id: 'companion',
    label: 'Conversations',
    iconName: 'MessageSquare',
    href: '/our-conversations'
  },
  {
    id: 'settings',
    label: 'Profile',
    iconName: 'User',
    href: '/profile'
  }
];
