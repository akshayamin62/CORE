const NAV_STACK_KEY = 'mobile-nav-stack';
const NAV_BACK_FLAG_KEY = 'mobile-nav-back';

export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 767px)').matches;
}

export function scrollAppToTop(): void {
  document.querySelectorAll('.app-role-layout-main, main.overflow-y-auto').forEach((node) => {
    if (node instanceof HTMLElement) {
      node.scrollTop = 0;
    }
  });
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export function scrollAppToTopSoon(): void {
  requestAnimationFrame(() => {
    scrollAppToTop();
    requestAnimationFrame(() => scrollAppToTop());
  });
}

function readNavStack(): string[] {
  try {
    const raw = sessionStorage.getItem(NAV_STACK_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === 'string') : [];
  } catch {
    return [];
  }
}

function writeNavStack(stack: string[]): void {
  sessionStorage.setItem(NAV_STACK_KEY, JSON.stringify(stack));
}

export function canGoBackInStack(): boolean {
  return readNavStack().length > 1;
}

export function markBackNavigation(): void {
  sessionStorage.setItem(NAV_BACK_FLAG_KEY, '1');
}

function consumeBackNavigation(): boolean {
  const isBack = sessionStorage.getItem(NAV_BACK_FLAG_KEY) === '1';
  if (isBack) {
    sessionStorage.removeItem(NAV_BACK_FLAG_KEY);
  }
  return isBack;
}

export function syncNavStackOnPathChange(path: string): 'forward' | 'back' | 'same' {
  const stack = readNavStack();

  if (consumeBackNavigation()) {
    while (stack.length > 1 && stack[stack.length - 1] !== path) {
      stack.pop();
    }
    if (stack[stack.length - 1] !== path) {
      stack.push(path);
    }
    writeNavStack(stack);
    return 'back';
  }

  if (stack.length >= 2 && stack[stack.length - 2] === path) {
    stack.pop();
    writeNavStack(stack);
    return 'back';
  }

  if (stack[stack.length - 1] === path) {
    return 'same';
  }

  stack.push(path);
  writeNavStack(stack);
  return 'forward';
}
