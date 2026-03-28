'use client';

interface PaymentSectionProps {
  paymentStatus?: string;
  paymentAmount?: number;
  paymentDate?: string;
  planTier?: string;
  serviceName?: string;
  readOnly?: boolean;
  onStatusChange?: (status: string) => void;
  onAmountChange?: (amount: number) => void;
}

const STATUS_OPTIONS = ['Pending', 'Paid', 'Failed', 'Refunded'];

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; icon: string }> = {
  paid: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', icon: '✓' },
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', icon: '⏳' },
  failed: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', icon: '✕' },
  refunded: { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400', icon: '↩' },
};

function getStatusStyle(status?: string) {
  if (!status) return { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400', icon: '—' };
  return STATUS_STYLES[status.toLowerCase()] || { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400', icon: '—' };
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return null;
  }
}

export default function PaymentSection({
  paymentStatus,
  paymentAmount,
  paymentDate,
  planTier,
  serviceName,
  readOnly = true,
  onStatusChange,
  onAmountChange,
}: PaymentSectionProps) {
  const statusStyle = getStatusStyle(paymentStatus);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Payment Information</h3>
              {serviceName && <p className="text-blue-100 text-sm">{serviceName}</p>}
            </div>
          </div>
          {readOnly && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Read Only
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Plan Tier */}
          {planTier && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Plan</p>
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-semibold border border-indigo-200">
                {planTier}
              </span>
            </div>
          )}

          {/* Payment Status */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Payment Status</p>
            {readOnly ? (
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusStyle.dot}`} />
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text} border`}>
                  {paymentStatus ? paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1) : 'Not Available'}
                </span>
              </div>
            ) : (
              <select
                value={paymentStatus || ''}
                onChange={(e) => onStatusChange?.(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Status</option>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          </div>

          {/* Payment Amount */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Amount</p>
            {readOnly ? (
              paymentAmount != null ? (
                <p className="text-xl font-bold text-gray-900">₹{paymentAmount.toLocaleString('en-IN')}</p>
              ) : (
                <p className="text-sm text-gray-400">—</p>
              )
            ) : (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  value={paymentAmount ?? ''}
                  onChange={(e) => onAmountChange?.(Number(e.target.value))}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {/* Payment Date */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Payment Date</p>
            {formatDate(paymentDate) ? (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-medium text-gray-700">{formatDate(paymentDate)}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">—</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">For payment queries, please contact your counselor or support team.</p>
        </div>
      </div>
    </div>
  );
}
