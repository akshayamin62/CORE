'use client';

import { FormStructure } from '@/types';

interface FormPartsNavigationProps {
  formStructure: FormStructure[];
  currentPartIndex: number;
  onPartChange: (index: number) => void;
  showDashboard?: boolean;
  isDashboardActive?: boolean;
  onDashboardClick?: () => void;
  showPayment?: boolean;
  isPaymentActive?: boolean;
  onPaymentClick?: () => void;
}

export default function FormPartsNavigation({
  formStructure,
  currentPartIndex,
  onPartChange,
  showDashboard = false,
  isDashboardActive = false,
  onDashboardClick,
  showPayment = false,
  isPaymentActive = false,
  onPaymentClick,
}: FormPartsNavigationProps) {
  if (formStructure.length === 0 && !showDashboard && !showPayment) return null;

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex overflow-x-auto border-b border-gray-200 scrollbar-none">
        {showDashboard && (
          <button
            onClick={onDashboardClick}
            className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors md:flex-1 md:px-6 md:py-4 ${
              isDashboardActive
                ? 'border-blue-600 bg-blue-50 text-blue-600'
                : 'border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            Dashboard
          </button>
        )}
        {formStructure.map((formStruct, index) => (
          <button
            key={formStruct.part.key}
            onClick={() => onPartChange(index)}
            className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors md:flex-1 md:px-6 md:py-4 ${
              !isDashboardActive && !isPaymentActive && currentPartIndex === index
                ? 'border-blue-600 bg-blue-50 text-blue-600'
                : 'border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {formStruct.part.title}
          </button>
        ))}
        {showPayment && (
          <button
            onClick={onPaymentClick}
            className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors md:flex-1 md:px-6 md:py-4 ${
              isPaymentActive
                ? 'border-blue-600 bg-blue-50 text-blue-600'
                : 'border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            Payment
          </button>
        )}
      </div>
    </div>
  );
}


