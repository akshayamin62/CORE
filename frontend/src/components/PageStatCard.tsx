'use client';

interface PageStatCardProps {
  title: string;
  mobileTitle?: string;
  value: string | number;
  color: 'blue' | 'green' | 'amber' | 'gray' | 'purple' | 'yellow';
  onClick?: () => void;
  active?: boolean;
  activeClassName?: string;
  /** Tighter centered layout for 3-column mobile stat rows */
  compact?: boolean;
}

const colorClasses: Record<PageStatCardProps['color'], string> = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  amber: 'bg-amber-100 text-amber-600',
  gray: 'bg-gray-200 text-gray-600',
  purple: 'bg-purple-100 text-purple-600',
  yellow: 'bg-yellow-100 text-yellow-600',
};

const activeBorderClasses: Record<PageStatCardProps['color'], string> = {
  blue: 'border-blue-500 ring-2 ring-blue-200',
  green: 'border-green-500 ring-2 ring-green-200',
  amber: 'border-amber-500 ring-2 ring-amber-200',
  gray: 'border-gray-500 ring-2 ring-gray-200',
  purple: 'border-purple-500 ring-2 ring-purple-200',
  yellow: 'border-yellow-500 ring-2 ring-yellow-200',
};

function StatUsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

export default function PageStatCard({
  title,
  mobileTitle,
  value,
  color,
  onClick,
  active = false,
  activeClassName,
  compact = false,
}: PageStatCardProps) {
  const interactive = Boolean(onClick);
  const label = mobileTitle || title;

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`rounded-xl border bg-white p-3 shadow-sm sm:p-3.5 md:p-6 ${
          interactive ? 'cursor-pointer transition-all hover:shadow-md' : ''
        } ${active ? activeClassName || activeBorderClasses[color] : 'border-gray-200'}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 text-left">
            <p className="text-[10px] font-semibold leading-tight break-words text-gray-600 sm:text-sm md:hidden">{label}</p>
            <p className="hidden text-sm text-gray-600 md:block">{title}</p>
            <p className="text-xl font-bold text-gray-900 sm:text-2xl md:text-3xl">{value}</p>
          </div>
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 md:h-12 md:w-12 ${colorClasses[color]}`}
          >
            <StatUsersIcon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border bg-white p-3.5 shadow-sm sm:p-6 ${
        interactive ? 'cursor-pointer transition-all hover:shadow-md' : ''
      } ${
        active
          ? activeClassName || activeBorderClasses[color]
          : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          {mobileTitle ? (
            <>
              <p className="text-[11px] font-medium leading-tight text-gray-600 sm:hidden">{mobileTitle}</p>
              <p className="hidden text-sm text-gray-600 sm:block">{title}</p>
            </>
          ) : (
            <p className="text-[11px] font-medium leading-tight break-words text-gray-600 sm:truncate sm:text-sm">
              {title}
            </p>
          )}
          <p className="text-xl font-bold text-gray-900 sm:text-3xl">{value}</p>
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12 ${colorClasses[color]}`}
        >
          <StatUsersIcon className="h-4 w-4 sm:h-6 sm:w-6" />
        </div>
      </div>
    </div>
  );
}
