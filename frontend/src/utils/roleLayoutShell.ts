/** Desktop role layouts: fixed sidebar below navbar (5rem), full viewport height. Mobile unchanged. */

export const roleLayoutShellClass =
  'app-role-layout-shell flex w-full min-w-0 max-w-full min-h-[calc(100vh-6.25rem)] bg-gray-50';

type RoleLayoutWidthOptions = {
  openWidth?: 'md:w-64' | 'md:w-72';
  closedWidth?: 'md:w-20';
};

/** Literal class pairs so Tailwind v4 includes margin/width utilities (no dynamic string building). */
const LAYOUT_WIDTHS = {
  'md:w-64': {
    openSidebar: 'md:w-64 app-role-sidebar-w-64',
    openMain: 'md:ml-64 app-role-main-offset-64',
    closedSidebar: 'md:w-20 app-role-sidebar-w-20',
    closedMain: 'md:ml-20 app-role-main-offset-20',
    dataWidth: '64',
  },
  'md:w-72': {
    openSidebar: 'md:w-72 app-role-sidebar-w-72',
    openMain: 'md:ml-72 app-role-main-offset-72',
    closedSidebar: 'md:w-20 app-role-sidebar-w-20',
    closedMain: 'md:ml-20 app-role-main-offset-20',
    dataWidth: '72',
  },
} as const;

function layoutConfig(options?: RoleLayoutWidthOptions) {
  return LAYOUT_WIDTHS[options?.openWidth ?? 'md:w-64'];
}

function widths(sidebarOpen: boolean, options?: RoleLayoutWidthOptions) {
  const layout = layoutConfig(options);
  return {
    sidebarWidth: sidebarOpen ? layout.openSidebar : layout.closedSidebar,
    mainMargin: sidebarOpen ? layout.openMain : layout.closedMain,
    dataWidth: layout.dataWidth,
  };
}

/** Shell wrapper props — data attributes drive CSS margin fallbacks on desktop. */
export function roleLayoutShellProps(
  sidebarOpen: boolean,
  options?: RoleLayoutWidthOptions,
  extraClass = ''
) {
  const { dataWidth } = widths(sidebarOpen, options);
  return {
    className: [roleLayoutShellClass, extraClass].filter(Boolean).join(' '),
    'data-sidebar': sidebarOpen ? 'open' : 'closed',
    'data-sidebar-width': dataWidth,
  } as const;
}

export function roleLayoutSidebarClass(sidebarOpen: boolean, options?: RoleLayoutWidthOptions) {
  const { sidebarWidth } = widths(sidebarOpen, options);
  return [
    'hidden md:flex flex-col shrink-0 overflow-y-auto bg-white border-r border-gray-200 transition-all duration-300',
    'app-desktop-sidebar',
    sidebarWidth,
  ].join(' ');
}

const ROLE_LAYOUT_MAIN_DEFAULTS =
  'app-role-layout-main min-w-0 w-full max-w-full flex-1 overflow-x-hidden app-main-mobile-pb';

export function roleLayoutMainClass(
  sidebarOpen: boolean,
  extra = '',
  options?: RoleLayoutWidthOptions
) {
  const { mainMargin } = widths(sidebarOpen, options);
  return [ROLE_LAYOUT_MAIN_DEFAULTS, 'transition-[margin] duration-300', mainMargin, extra]
    .filter(Boolean)
    .join(' ');
}
