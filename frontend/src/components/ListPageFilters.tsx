'use client';

export interface FilterOption {
  value: string;
  label: string;
  mobileLabel?: string;
}

export interface PillFilterConfig {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  emptyValue?: string;
}

interface ListPageFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  pillFilters?: PillFilterConfig[];
  onClear: () => void;
  desktopColumns?: 3 | 4;
}

function pillButtonClass(active: boolean) {
  return active
    ? 'shrink-0 rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm ring-1 ring-blue-600/20 transition-all active:scale-95'
    : 'shrink-0 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-95';
}

export default function ListPageFilters({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  pillFilters = [],
  onClear,
  desktopColumns = 3,
}: ListPageFiltersProps) {
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    pillFilters.some(
      (filter) => filter.value !== (filter.emptyValue ?? ''),
    );

  const desktopGridClass =
    desktopColumns === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3';

  return (
    <>
      {/* Mobile — compact search + pill tabs */}
      <div className="min-w-0 w-full space-y-2 md:hidden">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full min-w-0 rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
          />
        </div>

        {pillFilters.map((filter, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <div className="-mx-0.5 flex min-w-0 flex-1 gap-1 overflow-x-auto px-0.5 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {filter.options.map((option) => (
                <button
                  key={option.value || '__all__'}
                  type="button"
                  onClick={() => filter.onChange(option.value)}
                  className={pillButtonClass(filter.value === option.value)}
                >
                  {option.mobileLabel ?? option.label}
                </button>
              ))}
            </div>
            {index === pillFilters.length - 1 && hasActiveFilters && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Clear filters"
                title="Clear filters"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-600 active:scale-95"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}

        {pillFilters.length === 0 && hasActiveFilters && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClear}
              className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-all hover:bg-gray-50 active:scale-95"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Desktop — unchanged layout */}
      <div className={`hidden gap-4 md:grid ${desktopGridClass}`}>
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
        />
        {pillFilters.map((filter, index) => (
          <select
            key={index}
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          >
            {filter.options.map((option) => (
              <option key={option.value || '__all__'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ))}
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800"
        >
          Clear Filters
        </button>
      </div>
    </>
  );
}
