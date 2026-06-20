'use client';

/** Compact clickable lead stage stat card — 2-col mobile, 7-col desktop row */

export const leadStageStatGridClass =
  'mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:mb-8 lg:grid-cols-3 xl:grid-cols-7';

interface LeadStageStatCardProps {
  title: string;
  mobileTitle?: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'orange' | 'cyan' | 'gray';
  onClick?: () => void;
  isActive?: boolean;
  percentage?: number;
  showPercentage?: boolean;
}

const colorClasses: Record<LeadStageStatCardProps['color'], string> = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  red: 'bg-red-100 text-red-600',
  orange: 'bg-orange-100 text-orange-600',
  cyan: 'bg-cyan-100 text-cyan-600',
  gray: 'bg-gray-200 text-gray-600',
};

export default function LeadStageStatCard({
  title,
  mobileTitle,
  value,
  icon,
  color,
  onClick,
  isActive = false,
  percentage,
  showPercentage = true,
}: LeadStageStatCardProps) {
  const label = mobileTitle || title;

  return (
    <div
      className={`rounded-xl border-2 bg-white p-3 shadow-sm transition-all sm:p-3.5 md:p-5 ${
        onClick ? 'cursor-pointer hover:shadow-md active:scale-[0.98]' : ''
      } ${isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 md:h-10 md:w-10 ${colorClasses[color]} [&>svg]:h-3.5 [&>svg]:w-3.5 sm:[&>svg]:h-4 sm:[&>svg]:w-4 md:[&>svg]:h-6 md:[&>svg]:w-6`}
        >
          {icon}
        </div>
        <h3 className="text-lg font-extrabold text-gray-900 sm:text-xl md:text-3xl">{value}</h3>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-1 sm:mt-2 md:mt-3">
        <p className="min-w-0 flex-1 break-words text-[10px] font-semibold leading-tight text-gray-700 sm:truncate sm:text-xs md:text-sm">
          <span className="md:hidden">{label}</span>
          <span className="hidden md:inline">{title}</span>
        </p>
        {showPercentage && percentage !== undefined && (
          <p className="shrink-0 text-[10px] font-semibold text-gray-900 sm:text-xs md:text-sm">
            {percentage.toFixed(1)}%
          </p>
        )}
      </div>
    </div>
  );
}
