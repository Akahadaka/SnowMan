export type ShellNavigationItem = {
  label: string;
  path: string;
};

export const shellNavigationItems: ShellNavigationItem[] = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Profiles", path: "/profiles" },
  { label: "Mods", path: "/mods" },
  { label: "Settings", path: "/settings" },
];