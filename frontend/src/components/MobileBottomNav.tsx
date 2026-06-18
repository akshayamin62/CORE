'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface MobileNavChild {
  id: string;
  label: string;
  icon?: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

export interface MobileNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  children?: MobileNavChild[];
}

interface MobileBottomNavProps {
  items: MobileNavItem[];
  visibleCount?: number;
}

const VISIBLE_COUNT = 5;
const NAV_HEIGHT = 72;
const ICON_SIZE = 21;

function NavLabel({ label, isActive }: { label: string; isActive: boolean }) {
  const words = label.trim().split(/\s+/);
  const isMultiWord = words.length >= 2;
  const textClass = isActive ? 'font-semibold text-blue-700' : 'font-medium text-slate-600';

  if (isMultiWord) {
    return (
      <span
        className={`flex flex-col items-center justify-center leading-[1.1] text-center ${textClass}`}
        style={{ fontSize: 'clamp(9px, 2.5vw, 11px)' }}
      >
        {words.map((word, index) => (
          <span key={`${word}-${index}`} className="whitespace-nowrap">
            {word}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span
      className={`block text-center leading-tight whitespace-nowrap ${textClass}`}
      style={{ fontSize: 'clamp(9px, 2.6vw, 12px)' }}
    >
      {label}
    </span>
  );
}

export default function MobileBottomNav({ items, visibleCount = VISIBLE_COUNT }: MobileBottomNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const navShellRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const [indicatorLeft, setIndicatorLeft] = useState(0);

  const canScroll = items.length > visibleCount;
  const trackWidthPercent = canScroll ? (items.length / visibleCount) * 100 : 100;
  const itemWidthPercent = 100 / items.length;

  const activeIndex = items.findIndex((item) => item.isActive);

  const updateIndicator = useCallback(() => {
    const shell = navShellRef.current;
    const btn = activeIndex >= 0 ? itemRefs.current[activeIndex] : null;
    if (!shell || !btn || activeIndex < 0) return;
    const shellRect = shell.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setIndicatorLeft(btnRect.left - shellRect.left + btnRect.width / 2);
  }, [activeIndex]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const container = scrollRef.current;
      const el = itemRefs.current[index];
      if (!container || !el || index < 0 || index >= items.length) return;

      const slotWidth = container.clientWidth / visibleCount;
      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      const targetLeft = Math.min(maxScroll, Math.max(0, el.offsetLeft - (container.clientWidth - slotWidth) / 2));

      container.scrollTo({ left: targetLeft, behavior: 'smooth' });
    },
    [items.length, visibleCount]
  );

  const activateItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item) return;

      if (item.children?.length) {
        setOpenDropdownIndex((prev) => (prev === index ? null : index));
        return;
      }

      setOpenDropdownIndex(null);
      if (!item.isActive) item.onClick();
    },
    [items]
  );

  const handleItemClick = useCallback(
    (index: number) => {
      scrollToIndex(index);
      activateItem(index);
    },
    [activateItem, scrollToIndex]
  );

  useEffect(() => {
    if (activeIndex < 0) return;
    setOpenDropdownIndex(null);
    requestAnimationFrame(() => {
      scrollToIndex(activeIndex);
      updateIndicator();
    });
  }, [activeIndex, items.length, scrollToIndex, updateIndicator]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const onScroll = () => updateIndicator();
    container.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      container.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [updateIndicator, items.length]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length);
  }, [items.length]);

  if (items.length === 0) return null;

  const dropdownItem = openDropdownIndex !== null ? items[openDropdownIndex] : null;

  return (
    <>
      {dropdownItem?.children && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] bg-black/25 backdrop-blur-[1px] md:hidden"
            aria-label="Close menu"
            onClick={() => setOpenDropdownIndex(null)}
          />
          <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-[60] mx-auto max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl md:hidden">
            <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{dropdownItem.label}</p>
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              {dropdownItem.children.map((child) => (
                <li key={child.id}>
                  <button
                    type="button"
                    onClick={() => {
                      child.onClick();
                      setOpenDropdownIndex(null);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors duration-200 ${
                      child.isActive ? 'bg-blue-50 font-semibold text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {child.icon && (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-500 [&>svg]:h-4 [&>svg]:w-4">
                        {child.icon}
                      </span>
                    )}
                    {child.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        aria-label="Mobile navigation"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto w-full max-w-2xl px-2">
          <div
            ref={navShellRef}
            className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_-2px_20px_rgba(15,23,42,0.08)]"
            style={{ height: NAV_HEIGHT }}
          >
            <div
              ref={scrollRef}
              className={`h-full w-full ${
                canScroll
                  ? 'overflow-x-auto scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x'
                  : 'overflow-hidden'
              }`}
              style={{
                scrollSnapType: canScroll ? 'x proximity' : undefined,
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <div className="flex h-full items-stretch" style={{ width: `${trackWidthPercent}%`, minWidth: '100%' }}>
                {items.map((item, index) => {
                  const isActiveSlot = index === activeIndex;
                  const hasChildren = Boolean(item.children?.length);

                  return (
                    <button
                      key={item.id}
                      ref={(el) => {
                        itemRefs.current[index] = el;
                      }}
                      type="button"
                      onClick={() => handleItemClick(index)}
                      style={{
                        flex: `0 0 ${itemWidthPercent}%`,
                        width: `${itemWidthPercent}%`,
                        scrollSnapAlign: 'center',
                        minHeight: 44,
                      }}
                      className="relative flex h-full max-h-full shrink-0 flex-col items-center justify-center gap-0.5 overflow-hidden px-0.5 py-2 touch-manipulation transition-transform duration-200 active:scale-95"
                      aria-current={item.isActive ? 'page' : undefined}
                      aria-label={item.label}
                      aria-haspopup={hasChildren ? 'menu' : undefined}
                      aria-expanded={hasChildren && openDropdownIndex === index}
                    >
                      <span className={`shrink-0 text-slate-500 transition-colors duration-200 ${isActiveSlot ? 'text-blue-600' : ''}`}>
                        <span style={{ width: ICON_SIZE, height: ICON_SIZE }} className="block [&>svg]:h-[21px] [&>svg]:w-[21px]">
                          {item.icon}
                        </span>
                      </span>
                      <span className="flex min-h-0 max-h-[2.25rem] items-center justify-center px-0.5">
                        <NavLabel label={item.label} isActive={isActiveSlot} />
                      </span>
                      {hasChildren && (
                        <span className="absolute right-1 top-2 h-1.5 w-1.5 rotate-45 border-r border-b border-black" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            {activeIndex >= 0 && (
              <span
                className="pointer-events-none absolute bottom-1.5 h-[3px] w-8 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA] transition-[left] duration-200 ease-out"
                style={{ left: indicatorLeft }}
                aria-hidden
              />
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
