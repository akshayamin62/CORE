import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { MobileNavChild, MobileNavItem } from '@/components/MobileBottomNav';

export interface SimpleNavItem {
  name: string;
  icon: React.ReactNode;
  path?: string;
  children?: SimpleNavItem[];
}

export function isPathActive(pathname: string, path?: string): boolean {
  if (!path || path.startsWith('http')) return false;
  return pathname === path || pathname.startsWith(path + '/');
}

export function flattenNavItems(items: SimpleNavItem[]): SimpleNavItem[] {
  const result: SimpleNavItem[] = [];

  for (const item of items) {
    if (item.children?.length) {
      result.push(...flattenNavItems(item.children));
    } else if (item.path) {
      result.push(item);
    }
  }

  return result;
}

function navigatePath(path: string | undefined, router: AppRouterInstance) {
  if (!path) return;
  if (path.startsWith('http')) {
    window.open(path, '_blank', 'noopener,noreferrer');
  } else {
    router.push(path);
  }
}

function buildChildItems(
  children: SimpleNavItem[],
  pathname: string,
  router: AppRouterInstance,
  isActive: (path?: string) => boolean
): MobileNavChild[] {
  return children.map((child) => ({
    id: child.path || child.name,
    label: child.name,
    icon: child.icon,
    isActive: isActive(child.path),
    onClick: () => navigatePath(child.path, router),
  }));
}

export function buildPathMobileNavItems(
  items: SimpleNavItem[],
  pathname: string,
  router: AppRouterInstance,
  options?: {
    flatten?: boolean;
    preserveParents?: boolean;
    isActive?: (path?: string) => boolean;
  }
): MobileNavItem[] {
  const isActive = options?.isActive ?? ((path?: string) => isPathActive(pathname, path));

  if (options?.preserveParents) {
    return items.map((item) => {
      if (item.children?.length) {
        const children = buildChildItems(item.children, pathname, router, isActive);
        const activeChild = children.find((c) => c.isActive);

        return {
          id: item.name,
          label: activeChild?.label ?? item.name,
          icon: activeChild?.icon ?? item.icon,
          isActive: children.some((c) => c.isActive),
          children,
          onClick: () => {},
        };
      }

      return {
        id: item.path || item.name,
        label: item.name,
        icon: item.icon,
        isActive: isActive(item.path),
        onClick: () => navigatePath(item.path, router),
      };
    });
  }

  const navItems = options?.flatten ? flattenNavItems(items) : items.filter((item) => item.path);

  return navItems.map((item) => ({
    id: item.path || item.name,
    label: item.name,
    icon: item.icon,
    isActive: isActive(item.path),
    onClick: () => navigatePath(item.path, router),
  }));
}

export function buildCallbackMobileNavItems(
  items: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    children?: MobileNavChild[];
  }>
): MobileNavItem[] {
  return reorderPaymentAfterServiceProviders(
    items.map((item) => ({
      id: item.id,
      label: item.label,
      icon: item.icon,
      isActive: item.isActive,
      onClick: item.onClick,
      children: item.children,
    }))
  );
}

/** Mobile-only: keep Payment immediately after Service Providers (rightmost common tab). */
export function reorderPaymentAfterServiceProviders(items: MobileNavItem[]): MobileNavItem[] {
  const paymentIndex = items.findIndex(
    (item) => item.id === 'payment' || item.label.trim().toLowerCase() === 'payment'
  );
  if (paymentIndex === -1) return items;

  const paymentItem = items[paymentIndex];
  const withoutPayment = items.filter((_, index) => index !== paymentIndex);
  const serviceProvidersIndex = withoutPayment.findIndex((item) => item.id === 'service-providers');
  const insertAt = serviceProvidersIndex === -1 ? withoutPayment.length : serviceProvidersIndex + 1;

  return [
    ...withoutPayment.slice(0, insertAt),
    paymentItem,
    ...withoutPayment.slice(insertAt),
  ];
}
