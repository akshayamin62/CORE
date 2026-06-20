'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, serviceAPI, paymentAPI, invoiceAPI, ledgerAPI } from '@/lib/api';
import { USER_ROLE } from '@/types';
import { useRazorpay } from '@/hooks/useRazorpay';
import toast, { Toaster } from 'react-hot-toast';
import { roleListPagePadding, roleListTitleClass, roleListSubtitleClass, roleListBackBtnClass, navigateToStudentApplicationDashboard } from '@/components/studentDetailResponsive';
import StudentOuterPageLayout from '@/components/StudentOuterPageLayout';

// ===== Types =====
interface Registration {
  _id: string;
  serviceId: { _id: string; name: string; slug: string } | string;
  planTier?: string;
  paymentStatus?: string;
  paymentAmount?: number;
  paymentDate?: string;
  paymentModel?: string;
  totalAmount?: number;
  discountedAmount?: number;
  totalPaid?: number;
  paymentComplete?: boolean;
  gstRate?: number;
  installmentPlan?: {
    totalInstallments: number;
    completedInstallments: number;
    schedule: Array<{
      number: number;
      percentage: number;
      amount: number;
      status: string;
      label?: string;
      dueDate?: string;
      paidAt?: string;
      razorpayOrderId?: string;
    }>;
  };
  status?: string;
  createdAt?: string;
}

interface Payment {
  _id: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number;
  amountInr: number;
  type: string;
  installmentNumber: number;
  installmentPercentage: number;
  status: string;
  paidAt?: string;
  description?: string;
  createdAt?: string;
}

interface SummaryPayment {
  amountInr: number;
  status: string;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  type: string;
  serviceName: string;
  planTier: string;
  totalAmount: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;
  installmentNumber?: number;
  status: string;
  issuedAt?: string;
  paidAt?: string;
}

interface LedgerEntry {
  _id?: string;
  date: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

interface Ledger {
  _id: string;
  totalServiceAmount: number;
  totalDiscount: number;
  netPayable: number;
  totalPaid: number;
  balance: number;
  entries: LedgerEntry[];
}

interface UserInfo {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  profilePicture?: string;
  role?: string;
}

// ===== Style Maps =====
const SERVICE_COLORS: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  'study-abroad': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', gradient: 'from-blue-600 to-indigo-600' },
  'education-planning': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', gradient: 'from-purple-600 to-indigo-600' },
  'coaching-classes': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', gradient: 'from-teal-600 to-cyan-600' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  paid: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  partial: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  captured: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  created: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  failed: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  refunded: { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' },
};

const INST_STATUS: Record<string, { bg: string; text: string }> = {
  paid: { bg: 'bg-green-100', text: 'text-green-700' },
  due: { bg: 'bg-amber-100', text: 'text-amber-700' },
  pending: { bg: 'bg-gray-100', text: 'text-gray-600' },
  failed: { bg: 'bg-red-100', text: 'text-red-700' },
};

function sStyle(s?: string) {
  return STATUS_STYLES[s?.toLowerCase() || ''] || { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' };
}

function currency(n?: number) {
  if (n == null) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ===== Main Page =====
type ActiveTab = 'overview' | 'payments' | 'invoices' | 'ledger';

export default function StudentPaymentPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  const refreshData = useCallback(async () => {
    if (!selectedReg) return;
    setTabLoading(true);
    try {
      const [payRes, invRes, ledRes] = await Promise.all([
        paymentAPI.getPaymentsByRegistration(selectedReg._id),
        invoiceAPI.getInvoicesByRegistration(selectedReg._id),
        ledgerAPI.getLedgerByRegistration(selectedReg._id).catch(() => null),
      ]);
      setPayments(payRes.data.data.payments || []);
      setInvoices(invRes.data.data.invoices || []);
      setLedger(ledRes?.data?.data?.ledger || null);
      // Refresh registration data
      const regRes = await serviceAPI.getMyServices();
      const regs: Registration[] = regRes.data.data.registrations || [];
      setRegistrations(regs);
      const updated = regs.find(r => r._id === selectedReg._id);
      if (updated) setSelectedReg(updated);
    } catch {
      // silent
    } finally {
      setTabLoading(false);
    }
  }, [selectedReg]);

  const { openCheckout, verifyingPayment } = useRazorpay({
    onSuccess: () => refreshData(),
    onFailure: () => refreshData(),
  });

  useEffect(() => {
    const init = async () => {
      try {
        const res = await authAPI.getProfile();
        const u = res.data.data.user;
        if (u.role !== USER_ROLE.STUDENT) { router.push('/'); return; }
        setUser(u);
        const regRes = await serviceAPI.getMyServices();
        const regs = regRes.data.data.registrations || [];
        setRegistrations(regs);
        if (regs.length > 0) setSelectedReg(regs[0]);
      } catch {
        toast.error('Please login to continue');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  useEffect(() => {
    if (selectedReg) refreshData();
  }, [selectedReg?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePayNow = async (reg: Registration, installmentNumber?: number) => {
    try {
      const res = await paymentAPI.createOrder(reg._id, installmentNumber);
      const d = res.data.data;
      openCheckout({
        orderId: d.orderId,
        amount: d.amount,
        amountInr: d.amountInr,
        currency: d.currency,
        keyId: d.keyId,
        prefill: { name: [user?.firstName, user?.lastName].filter(Boolean).join(' '), email: user?.email, contact: user?.phone },
        description: `Payment for ${getServiceName(reg)}`,
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create payment order');
    }
  };

  const getServiceName = (reg: Registration) => typeof reg.serviceId === 'object' ? reg.serviceId.name : 'Service';
  const getServiceSlug = (reg: Registration) => typeof reg.serviceId === 'object' ? reg.serviceId.slug : '';

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" /> },
    { key: 'payments', label: 'Payments', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /> },
    { key: 'invoices', label: 'Invoices', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
    { key: 'ledger', label: 'Ledger', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /> },
  ];

  return (
    <>
      <Toaster position="top-right" />
      {verifyingPayment && (
        <div className="app-modal-overlay fixed inset-0 z-[70] flex items-end justify-center bg-black/50 md:items-center md:p-4">
          <div className="app-modal-panel bg-white rounded-2xl p-8 text-center shadow-2xl">
            <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900">Verifying Payment...</p>
            <p className="text-sm text-gray-500 mt-1">Please wait while we confirm your payment.</p>
          </div>
        </div>
      )}
      <StudentOuterPageLayout user={user}>
      <div className={`${roleListPagePadding} mx-auto max-w-6xl`}>
        <button type="button" onClick={() => navigateToStudentApplicationDashboard(router)} className={roleListBackBtnClass}>
          <svg className="mr-1.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Return to Dashboard
        </button>
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className={roleListTitleClass}>Payment Center</h1>
          <p className={roleListSubtitleClass}>Manage payments, view invoices, and track your financial history.</p>
        </div>

        {registrations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No registrations found</p>
            <p className="text-gray-400 text-sm mt-1">Register for a service to see payment details here.</p>
            <button onClick={() => router.push('/student/service-plans')} className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Browse Services
            </button>
          </div>
        ) : (
          <>
            {/* Service Selector */}
            {registrations.length > 1 && (
              <div className="-mx-0.5 mb-4 flex gap-2 overflow-x-auto px-0.5 pb-0.5 sm:mb-6 sm:flex-wrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {registrations.map((reg) => {
                  const name = getServiceName(reg);
                  const slug = getServiceSlug(reg);
                  const colors = SERVICE_COLORS[slug] || SERVICE_COLORS['study-abroad'];
                  const active = selectedReg?._id === reg._id;
                  return (
                    <button
                      key={reg._id}
                      onClick={() => setSelectedReg(reg)}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:px-4 sm:py-2 sm:text-sm ${active
                          ? `bg-gradient-to-r ${colors.gradient} text-white shadow-md`
                          : `${colors.bg} ${colors.text} border ${colors.border} hover:shadow-sm`
                        }`}
                    >
                      {name} {reg.planTier && `· ${reg.planTier}`}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedReg && (
              <>
                {/* Summary Cards */}
                <SummaryCards reg={selectedReg} payments={payments} />

                {/* Tabs */}
                <div className="mt-4 border-b border-gray-200 sm:mt-6">
                  <nav className="-mb-px flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {tabs.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors sm:gap-2 sm:px-4 sm:py-3 sm:text-sm ${activeTab === t.key
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                          }`}
                      >
                        <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{t.icon}</svg>
                        {t.label}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="mt-4 sm:mt-6">
                  {tabLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="animate-spin w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <>
                      {activeTab === 'overview' && <OverviewTab reg={selectedReg} onPayNow={handlePayNow} />}
                      {activeTab === 'payments' && <PaymentsTab payments={payments} />}
                      {activeTab === 'invoices' && <InvoicesTab invoices={invoices} />}
                      {activeTab === 'ledger' && <LedgerTab ledger={ledger} />}
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
      </StudentOuterPageLayout>
    </>
  );
}

// ===== Summary Cards =====
function SummaryCards({ reg, payments }: { reg: Registration; payments: SummaryPayment[] }) {
  const GST_RATE = reg.gstRate ?? 18;
  const hasInstallments = (reg.installmentPlan?.schedule?.length ?? 0) > 0;
  let baseTotal = reg.discountedAmount ?? reg.totalAmount ?? reg.paymentAmount ?? 0;
  const paidFromPayments = payments
    .filter((p) => p.status === 'captured' || p.status === 'paid')
    .reduce((sum, p) => sum + (p.amountInr || 0), 0);
  const totalPaid = (reg.totalPaid && reg.totalPaid > 0) ? reg.totalPaid : paidFromPayments;

  // Fallback: if base fields are missing for one-time payments, derive from totalPaid
  if (baseTotal <= 0 && !hasInstallments && totalPaid > 0) {
    baseTotal = Math.round(totalPaid * 100 / (100 + GST_RATE));
  }

  const gstAmount = Math.round(baseTotal * GST_RATE / 100);
  // For installments: netPayable = sum of schedule amounts (GST-inclusive)
  // For one-time: netPayable = base + GST
  const netPayable = hasInstallments
    ? reg.installmentPlan!.schedule!.reduce((sum, s) => sum + s.amount, 0)
    : baseTotal + gstAmount;
  const balance = Math.max(0, netPayable - totalPaid);
  const pst = sStyle(reg.paymentStatus);
  const progress = netPayable > 0 ? Math.min(100, Math.round((totalPaid / netPayable) * 100)) : 0;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
          <div className="mb-2 flex items-center justify-between sm:mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 sm:text-xs">Total Amount</p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 sm:h-9 sm:w-9">
              <svg className="h-4 w-4 text-blue-600 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>
            </div>
          </div>
          <p className="text-lg font-bold text-gray-900 sm:text-2xl">{currency(netPayable)}</p>
          <div className="mt-1 space-y-0.5">
            <p className="text-xs text-gray-500">Base: {currency(baseTotal)}</p>
            {reg.discountedAmount != null && reg.discountedAmount !== reg.totalAmount && (
              <p className="text-xs text-green-600">Discount applied: -{currency((reg.totalAmount || 0) - reg.discountedAmount)}</p>
            )}
            <p className="text-xs text-gray-500">GST ({GST_RATE}%): +{currency(gstAmount)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
          <div className="mb-2 flex items-center justify-between sm:mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 sm:text-xs">Paid</p>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-100 sm:h-9 sm:w-9">
              <svg className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
          </div>
          <p className="text-lg font-bold text-gray-900 sm:text-2xl">{currency(totalPaid)}</p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
            <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{progress}% paid</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
          <div className="mb-2 flex items-center justify-between sm:mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 sm:text-xs">Balance</p>
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${balance > 0 ? 'bg-amber-100' : 'bg-green-100'}`}>
              <svg className={`h-4 w-4 sm:h-5 sm:w-5 ${balance > 0 ? 'text-amber-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" /></svg>
            </div>
          </div>
          <p className={`text-lg font-bold sm:text-2xl ${balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>{currency(balance)}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
          <div className="mb-2 flex items-center justify-between sm:mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 sm:text-xs">Status</p>
          </div>
          <div className="mt-0.5 flex items-center gap-2 sm:mt-1">
            <span className={`h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 ${pst.dot}`} />
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold sm:px-3 sm:py-1 sm:text-sm ${pst.bg} ${pst.text}`}>
              {reg.paymentComplete ? 'Fully Paid' : reg.paymentStatus ? reg.paymentStatus.charAt(0).toUpperCase() + reg.paymentStatus.slice(1) : 'Pending'}
            </span>
          </div>
          {reg.paymentModel && (
            <p className="text-xs text-gray-400 mt-2 capitalize">{reg.paymentModel === 'installment' ? 'Installment Plan' : 'One-time Payment'}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Overview Tab =====
function OverviewTab({ reg, onPayNow }: { reg: Registration; onPayNow: (r: Registration, inst?: number) => void }) {
  const GST_RATE = reg.gstRate ?? 18;

  if (reg.paymentModel === 'installment' && reg.installmentPlan) {
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-3 py-3 sm:px-6 sm:py-4">
            <h3 className="text-sm font-semibold text-gray-900 sm:text-base">Installment Schedule</h3>
            <p className="text-xs text-gray-500 sm:text-sm">{reg.installmentPlan.completedInstallments} of {reg.installmentPlan.totalInstallments} installments paid</p>
          </div>
          <div className="divide-y divide-gray-100">
            {reg.installmentPlan.schedule.map((inst) => {
              const ist = INST_STATUS[inst.status] || INST_STATUS.pending;
              const baseAmt = Math.round(inst.amount * 100 / (100 + GST_RATE));
              const gstAmt = inst.amount - baseAmt;
              const isUpgradeEntry = inst.number >= 100;
              const canPay = !isUpgradeEntry && (inst.status === 'due' || (inst.status === 'pending' && inst.number === 1));
              return (
                <div key={inst.number} className="flex flex-col gap-3 px-3 py-3 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold sm:h-10 sm:w-10 ${inst.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {inst.status === 'paid' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      ) : inst.number}
                    </div>
                    <div>
                      {isUpgradeEntry ? (
                        <>
                          <p className="font-medium text-gray-900">Service Upgradation</p>
                          <p className="text-sm text-gray-500">{inst.label || 'Plan upgrade'}</p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-gray-900">Installment #{inst.number}</p>
                          <p className="text-sm text-gray-500">{inst.percentage}% of total</p>
                        </>
                      )}
                      <p className="text-xs text-gray-400">Base: {currency(baseAmt)} + GST: {currency(gstAmt)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-semibold text-gray-900 sm:text-base">{currency(inst.amount)}</p>
                      <p className="text-[10px] text-gray-400 sm:text-xs">{GST_RATE > 0 ? `(incl. ${GST_RATE}% GST)` : '(no GST)'}</p>
                      {inst.paidAt && <p className="text-[10px] text-green-600 sm:text-xs">Paid on {fmtDate(inst.paidAt)}</p>}
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium sm:px-3 sm:py-1 sm:text-xs ${ist.bg} ${ist.text}`}>
                      {inst.status.charAt(0).toUpperCase() + inst.status.slice(1)}
                    </span>
                    {canPay && (
                      <button onClick={() => onPayNow(reg, inst.number)} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700 sm:w-auto sm:px-4 sm:text-sm">
                        Pay Now
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 sm:p-5">
          <div className="flex gap-2.5 sm:gap-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div>
              <p className="text-xs font-medium text-blue-800 sm:text-sm">Installment Payment Plan</p>
              <p className="mt-1 text-xs text-blue-600 sm:text-sm">Your payments are split into 3 installments (50% / 30% / 20%).{GST_RATE > 0 ? ` All amounts include ${GST_RATE}% GST.` : ''} Each installment must be completed before the next one becomes available.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  let effectiveAmount = reg.discountedAmount ?? reg.totalAmount ?? 0;
  // Fallback: derive from totalPaid if base fields missing
  if (effectiveAmount <= 0 && (reg.totalPaid ?? 0) > 0) {
    effectiveAmount = Math.round((reg.totalPaid ?? 0) * 100 / (100 + GST_RATE));
  }
  const isPaid = reg.paymentComplete || reg.paymentStatus === 'paid';

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-3 py-3 sm:px-6 sm:py-4"><h3 className="text-sm font-semibold text-gray-900 sm:text-base">Payment Details</h3></div>
        <div className="p-3 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-6">
            <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Service</p><p className="text-sm font-medium text-gray-900">{typeof reg.serviceId === 'object' ? reg.serviceId.name : 'Service'}</p></div>
            <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Plan</p><p className="text-sm font-medium text-gray-900">{reg.planTier || '—'}</p></div>
            <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Amount</p><p className="text-lg font-bold text-gray-900">{currency(effectiveAmount)}</p></div>
            <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Payment Date</p><p className="text-sm font-medium text-gray-900">{fmtDate(reg.paymentDate)}</p></div>
          </div>
          {!isPaid && effectiveAmount > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <button onClick={() => onPayNow(reg)} className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg">
                Pay {currency(effectiveAmount)}
              </button>
            </div>
          )}
          {isPaid && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2 text-green-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="font-medium">Payment completed</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Payments Tab =====
function PaymentsTab({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
        <p className="text-gray-500 font-medium">No payments yet</p>
        <p className="text-gray-400 text-sm mt-1">Payments will appear here after you make your first payment.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:hidden">
        <div className="divide-y divide-gray-100">
        {payments.map((p) => {
          const st = sStyle(p.status);
          return (
            <div key={p._id} className="space-y-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{p.description || `Installment #${p.installmentNumber}`}</p>
                  <p className="text-xs text-gray-400">{fmtDate(p.paidAt || p.createdAt)}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-gray-900">{currency(p.amountInr)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.bg} ${st.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                  {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                </span>
                <span className="text-[10px] text-gray-400">{p.type === 'miscellaneous' ? 'Miscellaneous' : `${p.installmentPercentage}%`}</span>
              </div>
              {p.razorpayPaymentId && (
                <p className="truncate font-mono text-[10px] text-gray-400">{p.razorpayPaymentId}</p>
              )}
            </div>
          );
        })}
        </div>
      </div>
      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map((p) => {
              const st = sStyle(p.status);
              return (
                <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{fmtDate(p.paidAt || p.createdAt)}</td>
                  <td className="px-6 py-4"><p className="text-sm font-medium text-gray-900">{p.description || `Installment #${p.installmentNumber}`}</p><p className="text-xs text-gray-400">{p.type === 'miscellaneous' ? 'Miscellaneous' : `${p.installmentPercentage}%`}</p></td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{currency(p.amountInr)}</td>
                  <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${st.bg} ${st.text}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</span></td>
                  <td className="px-6 py-4 text-xs text-gray-400 font-mono">{p.razorpayPaymentId || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>
    </>
  );
}

// ===== Invoices Tab =====
function InvoicesTab({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        <p className="text-gray-500 font-medium">No invoices yet</p>
        <p className="text-gray-400 text-sm mt-1">Invoices will be generated after payments are processed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {invoices.map((inv) => {
        const isProforma = inv.type === 'proforma';
        return (
          <div key={inv._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isProforma ? 'bg-amber-100' : 'bg-blue-100'}`}>
                  <svg className={`w-5 h-5 ${isProforma ? 'text-amber-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{inv.invoiceNumber}</p>
                  <p className="text-sm text-gray-500">{isProforma ? 'Proforma Invoice' : 'Tax Invoice'} · {inv.serviceName} · {inv.planTier}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{currency(inv.grandTotal)}</p>
                <p className="text-xs text-gray-400">{fmtDate(inv.issuedAt)}</p>
              </div>
            </div>
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
              <div><span className="text-gray-400">Subtotal</span><p className="font-medium text-gray-700">{currency(inv.totalAmount)}</p></div>
              {inv.discountAmount > 0 && <div><span className="text-gray-400">Discount</span><p className="font-medium text-green-600">-{currency(inv.discountAmount)}</p></div>}
              <div><span className="text-gray-400">Taxable</span><p className="font-medium text-gray-700">{currency(inv.taxableAmount)}</p></div>
              <div><span className="text-gray-400">GST ({inv.gstRate}%)</span><p className="font-medium text-gray-700">{currency(inv.gstAmount)}</p></div>
              <div><span className="text-gray-400">Status</span><p className={`font-medium ${inv.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>{inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</p></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===== Ledger Tab =====
function LedgerTab({ ledger }: { ledger: Ledger | null }) {
  if (!ledger) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        <p className="text-gray-500 font-medium">No ledger entries</p>
        <p className="text-gray-400 text-sm mt-1">Financial records will appear here after payments are made.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {[
          { label: 'Service Amount', value: ledger.totalServiceAmount, color: 'text-gray-900' },
          { label: 'Discount', value: ledger.totalDiscount, color: 'text-green-600' },
          { label: 'Net Payable', value: ledger.netPayable, color: 'text-blue-600' },
          { label: 'Total Paid', value: ledger.totalPaid, color: 'text-green-600' },
          { label: 'Balance', value: ledger.balance, color: ledger.balance > 0 ? 'text-amber-600' : 'text-green-600' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 sm:text-xs">{item.label}</p>
            <p className={`mt-0.5 text-base font-bold sm:mt-1 sm:text-lg ${item.color}`}>{currency(item.value)}</p>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-3 py-3 sm:px-6 sm:py-4">
          <h3 className="text-sm font-semibold text-gray-900 sm:text-base">Transaction History</h3>
        </div>
        <div className="divide-y divide-gray-100 md:hidden">
          {ledger.entries.map((e, i) => (
            <div key={e._id || i} className="space-y-1.5 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-sm font-medium text-gray-900">{e.description}</p>
                <p className="shrink-0 text-xs text-gray-500">{fmtDate(e.date)}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                {e.debit > 0 && <span className="font-medium text-red-600">Debit: {currency(e.debit)}</span>}
                {e.credit > 0 && <span className="font-medium text-green-600">Credit: {currency(e.credit)}</span>}
                <span className="font-semibold text-gray-900">Bal: {currency(e.runningBalance)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Debit</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Credit</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ledger.entries.map((e, i) => (
                <tr key={e._id || i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-sm text-gray-700 whitespace-nowrap">{fmtDate(e.date)}</td>
                  <td className="px-6 py-3 text-sm text-gray-900">{e.description}</td>
                  <td className="px-6 py-3 text-sm text-right font-medium text-red-600">{e.debit > 0 ? currency(e.debit) : ''}</td>
                  <td className="px-6 py-3 text-sm text-right font-medium text-green-600">{e.credit > 0 ? currency(e.credit) : ''}</td>
                  <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">{currency(e.runningBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
