export type ShellNavigationItem = {
  label: string;
  path: string;
};

export const shellNavigationItems: ShellNavigationItem[] = [
  { label: 'Profiles', path: '/profiles' },
  { label: 'Mods', path: '/mods' },
  { label: 'Settings', path: '/settings' },
];
