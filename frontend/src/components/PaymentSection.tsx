'use client';

import { useEffect, useState, useCallback } from 'react';
import { paymentAPI, invoiceAPI, ledgerAPI } from '@/lib/api';

interface PaymentSectionProps {
  registrationId?: string;
  studentId?: string;
  paymentStatus?: string;
  paymentAmount?: number;
  paymentDate?: string;
  planTier?: string;
  serviceName?: string;
  totalAmount?: number;
  discountedAmount?: number;
  paymentModel?: string;
  installmentPlan?: {
    totalInstallments: number;
    completedInstallments: number;
    schedule: Array<{
      number: number;
      percentage: number;
      amount: number;
      status: string;
      dueDate?: string;
      paidAt?: string;
    }>;
  };
  totalPaid?: number;
  paymentComplete?: boolean;
  // Tax (GST) rate (%) snapshotted on the registration (defaults to 18)
  gstRate?: number;
  readOnly?: boolean;
  onStatusChange?: (status: string) => void;
  onAmountChange?: (amount: number) => void;
}

interface PaymentRecord {
  _id: string;
  razorpayPaymentId?: string;
  amountInr: number;
  installmentNumber: number;
  installmentPercentage: number;
  status: string;
  paidAt?: string;
  description?: string;
  createdAt?: string;
}

interface InvoiceRecord {
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
  date: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

interface LedgerRecord {
  totalServiceAmount: number;
  totalDiscount: number;
  netPayable: number;
  totalPaid: number;
  balance: number;
  entries: LedgerEntry[];
}

const DEFAULT_GST_RATE = 18;

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  paid: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  partial: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  captured: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  created: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  failed: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  refunded: { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' },
};

function sStyle(s?: string) {
  return STATUS_STYLES[s?.toLowerCase() || ''] || { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' };
}

function fmt(n?: number) {
  if (n == null) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

type Tab = 'overview' | 'payments' | 'invoices' | 'ledger';

export default function PaymentSection({
  registrationId,
  paymentStatus,
  paymentAmount,
  paymentDate,
  planTier,
  serviceName,
  totalAmount,
  discountedAmount,
  paymentModel,
  installmentPlan,
  totalPaid: regTotalPaid,
  paymentComplete,
  gstRate,
  readOnly = true,
}: PaymentSectionProps) {
  const GST_RATE = typeof gstRate === 'number' ? gstRate : DEFAULT_GST_RATE;
  const [tab, setTab] = useState<Tab>('overview');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [ledger, setLedger] = useState<LedgerRecord | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!registrationId) return;
    setDataLoading(true);
    try {
      const [payRes, invRes, ledRes] = await Promise.all([
        paymentAPI.getPaymentsByRegistration(registrationId),
        invoiceAPI.getInvoicesByRegistration(registrationId),
        ledgerAPI.getLedgerByRegistration(registrationId).catch(() => null),
      ]);
      setPayments(payRes.data.data.payments || []);
      setInvoices(invRes.data.data.invoices || []);
      setLedger(ledRes?.data?.data?.ledger || null);
    } catch { /* silent */ }
    finally { setDataLoading(false); }
  }, [registrationId]);

  useEffect(() => { if (registrationId) fetchData(); }, [registrationId, fetchData]);

  const hasInstallments = (installmentPlan?.schedule?.length ?? 0) > 0;
  let baseTotal = discountedAmount ?? totalAmount ?? paymentAmount ?? 0;
  const capturedPayments = payments.filter(p => p.status === 'captured');
  const totalPaid = (regTotalPaid && regTotalPaid > 0) ? regTotalPaid : capturedPayments.reduce((s, p) => s + p.amountInr, 0);

  // Fallback: if base fields are missing for one-time payments, derive from totalPaid
  if (baseTotal <= 0 && !hasInstallments && totalPaid > 0) {
    baseTotal = Math.round(totalPaid * 100 / (100 + GST_RATE));
  }

  const gstAmount = Math.round(baseTotal * GST_RATE / 100);
  // For installments: netPayable = sum of schedule amounts (GST-inclusive)
  // For one-time: netPayable = base + GST
  const netPayable = hasInstallments
    ? installmentPlan!.schedule!.reduce((sum, s) => sum + s.amount, 0)
    : baseTotal + gstAmount;
  const balance = Math.max(0, netPayable - totalPaid);
  const progress = netPayable > 0 ? Math.min(100, Math.round((totalPaid / netPayable) * 100)) : 0;
  const pst = sStyle(paymentStatus);
  const isInstallment = paymentModel === 'installment' && hasInstallments;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'payments', label: `Payments${payments.length ? ` (${payments.length})` : ''}` },
    { key: 'invoices', label: `Invoices${invoices.length ? ` (${invoices.length})` : ''}` },
    { key: 'ledger', label: 'Ledger' },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20 sm:h-10 sm:w-10">
              <svg className="h-4 w-4 text-white sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white sm:text-lg">Payment Information</h3>
              {serviceName && <p className="truncate text-xs text-blue-100 sm:text-sm">{serviceName} {planTier && `· ${planTier}`}</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isInstallment && (
              <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-medium text-white sm:px-3 sm:text-xs">
                Installment Plan
              </span>
            )}
            {readOnly && (
              <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-medium text-white sm:px-3 sm:text-xs">
                Read Only
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-4 sm:p-6">
        <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="mb-2 flex items-center justify-between sm:mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 sm:text-xs">Net Payable</p>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 sm:h-9 sm:w-9">
                <svg className="h-4 w-4 text-blue-600 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900 sm:text-xl">{fmt(netPayable)}</p>
            <div className="mt-1 space-y-0.5">
              <p className="text-[10px] text-gray-400 sm:text-xs">Base: {fmt(baseTotal)}</p>
              {discountedAmount != null && discountedAmount !== totalAmount && (
                <p className="text-[10px] text-green-600 sm:text-xs">Discount: -{fmt((totalAmount || 0) - discountedAmount)}</p>
              )}
              <p className="text-[10px] text-gray-400 sm:text-xs">GST ({GST_RATE}%): +{fmt(gstAmount)}</p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="mb-2 flex items-center justify-between sm:mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 sm:text-xs">Paid</p>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-100 sm:h-9 sm:w-9">
                <svg className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
            </div>
            <p className="text-lg font-bold text-green-600 sm:text-xl">{fmt(totalPaid)}</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
              <div className="h-1.5 rounded-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-gray-400 sm:text-xs">{progress}% paid</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="mb-2 flex items-center justify-between sm:mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 sm:text-xs">Balance</p>
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${balance > 0 ? 'bg-amber-100' : 'bg-green-100'}`}>
                <svg className={`h-4 w-4 sm:h-5 sm:w-5 ${balance > 0 ? 'text-amber-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" /></svg>
              </div>
            </div>
            <p className={`text-lg font-bold sm:text-xl ${balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>{fmt(balance)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 sm:mb-3 sm:text-xs">Status</p>
            <div className="mt-0.5 flex items-center gap-2 sm:mt-1">
              <span className={`h-2 w-2 rounded-full ${pst.dot}`} />
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold sm:px-2.5 sm:py-1 sm:text-sm ${pst.bg} ${pst.text}`}>
                {paymentComplete ? 'Fully Paid' : paymentStatus ? paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1) : 'Pending'}
              </span>
            </div>
            {paymentDate && <p className="mt-1 text-[10px] text-gray-400 sm:text-xs">Last: {fmtDate(paymentDate)}</p>}
          </div>
        </div>

        {/* Tabs */}
        {registrationId && (
          <>
            <div className="-mx-4 mb-4 overflow-x-auto border-b border-gray-200 px-4 sm:mx-0 sm:px-0">
              <nav className="-mb-px flex min-w-max gap-1">
                {tabs.map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={`shrink-0 border-b-2 px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:py-2.5 sm:text-sm ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    {t.label}
                  </button>
                ))}
              </nav>
            </div>

            {dataLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                {/* Overview */}
                {tab === 'overview' && isInstallment && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">Installment Schedule ({installmentPlan!.completedInstallments}/{installmentPlan!.totalInstallments} paid)</h4>
                    <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
                      {installmentPlan!.schedule.map(inst => {
                        const ist = STATUS_STYLES[inst.status] || STATUS_STYLES.pending;
                        const baseAmt = Math.round(inst.amount * 100 / (100 + GST_RATE));
                        const gst = inst.amount - baseAmt;
                        return (
                          <div key={inst.number} className="flex flex-col gap-3 bg-white px-3 py-3 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${inst.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {inst.status === 'paid' ? '✓' : inst.number}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">Installment #{inst.number} ({inst.percentage}%)</p>
                                <p className="text-xs text-gray-400">Base: {fmt(baseAmt)} + GST: {fmt(gst)}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                              <div className="text-left sm:text-right">
                                <p className="text-sm font-semibold text-gray-900">{fmt(inst.amount)}</p>
                                {inst.paidAt && <p className="text-xs text-green-600">{fmtDate(inst.paidAt)}</p>}
                              </div>
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ist.bg} ${ist.text}`}>
                                {inst.status.charAt(0).toUpperCase() + inst.status.slice(1)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {tab === 'overview' && !isInstallment && (
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 sm:p-5">
                    <div className="grid grid-cols-2 gap-3 text-sm sm:gap-4">
                      <div><span className="text-gray-400">Service</span><p className="font-medium text-gray-900">{serviceName || '—'}</p></div>
                      <div><span className="text-gray-400">Plan</span><p className="font-medium text-gray-900">{planTier || '—'}</p></div>
                      <div><span className="text-gray-400">Amount (incl. GST)</span><p className="font-medium text-gray-900">{fmt(netPayable)}</p></div>
                      <div><span className="text-gray-400">Payment Date</span><p className="font-medium text-gray-900">{fmtDate(paymentDate)}</p></div>
                    </div>
                  </div>
                )}

                {/* Payments Tab */}
                {tab === 'payments' && (
                  payments.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-400">No payment records yet.</p>
                  ) : (
                    <>
                      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:hidden">
                        <div className="divide-y divide-gray-100">
                          {payments.map(p => {
                            const st = sStyle(p.status);
                            return (
                              <div key={p._id} className="space-y-2 p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900">{p.description || `Installment #${p.installmentNumber}`}</p>
                                    <p className="text-xs text-gray-400">{fmtDate(p.paidAt || p.createdAt)}</p>
                                  </div>
                                  <p className="shrink-0 text-sm font-semibold text-gray-900">{fmt(p.amountInr)}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.bg} ${st.text}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                                    {p.status}
                                  </span>
                                </div>
                                {p.razorpayPaymentId && (
                                  <p className="truncate font-mono text-[10px] text-gray-400">{p.razorpayPaymentId}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="hidden overflow-hidden rounded-lg border border-gray-200 md:block">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b bg-gray-50">
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Description</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Amount</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Razorpay ID</th>
                          </tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            {payments.map(p => {
                              const st = sStyle(p.status);
                              return (
                                <tr key={p._id} className="hover:bg-gray-50">
                                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{fmtDate(p.paidAt || p.createdAt)}</td>
                                  <td className="px-4 py-3 text-gray-900">{p.description || `Installment #${p.installmentNumber}`}</td>
                                  <td className="px-4 py-3 font-semibold text-gray-900">{fmt(p.amountInr)}</td>
                                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.bg} ${st.text}`}>{p.status}</span></td>
                                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.razorpayPaymentId || '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )
                )}

                {/* Invoices Tab */}
                {tab === 'invoices' && (
                  invoices.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-400">No invoices generated yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {invoices.map(inv => {
                        const isProforma = inv.type === 'proforma';
                        return (
                          <div key={inv._id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
                              <div className="flex items-center gap-3">
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${isProforma ? 'bg-amber-100' : 'bg-blue-100'}`}>
                                  <svg className={`h-4 w-4 ${isProforma ? 'text-amber-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-gray-900">{inv.invoiceNumber}</p>
                                  <p className="text-xs text-gray-500">{isProforma ? 'Proforma' : 'Tax Invoice'} · {fmtDate(inv.issuedAt)}</p>
                                </div>
                              </div>
                              <p className="text-sm font-bold text-gray-900 sm:text-base">{fmt(inv.grandTotal)}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 border-t bg-gray-50 px-3 py-2 text-xs sm:grid-cols-4 sm:gap-3 sm:px-4 sm:py-2.5">
                              <div><span className="text-gray-400">Taxable</span><p className="font-medium">{fmt(inv.taxableAmount)}</p></div>
                              <div><span className="text-gray-400">GST ({inv.gstRate}%)</span><p className="font-medium">{fmt(inv.gstAmount)}</p></div>
                              <div><span className="text-gray-400">Total</span><p className="font-medium">{fmt(inv.grandTotal)}</p></div>
                              <div><span className="text-gray-400">Status</span><p className={`font-medium ${inv.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>{inv.status}</p></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}

                {/* Ledger Tab */}
                {tab === 'ledger' && (
                  !ledger ? (
                    <p className="py-8 text-center text-sm text-gray-400">No ledger entries yet.</p>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
                        {[
                          { l: 'Service Amt', v: ledger.totalServiceAmount, c: 'text-gray-900' },
                          { l: 'Discount', v: ledger.totalDiscount, c: 'text-green-600' },
                          { l: 'Net Payable', v: ledger.netPayable, c: 'text-blue-600' },
                          { l: 'Paid', v: ledger.totalPaid, c: 'text-green-600' },
                          { l: 'Balance', v: ledger.balance, c: ledger.balance > 0 ? 'text-amber-600' : 'text-green-600' },
                        ].map(i => (
                          <div key={i.l} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 sm:text-xs">{i.l}</p>
                            <p className={`mt-0.5 text-base font-bold sm:mt-1 sm:text-lg ${i.c}`}>{fmt(i.v)}</p>
                          </div>
                        ))}
                      </div>
                      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-100 px-3 py-3 sm:px-6 sm:py-4">
                          <h3 className="text-sm font-semibold text-gray-900 sm:text-base">Transaction History</h3>
                        </div>
                        <div className="divide-y divide-gray-100 md:hidden">
                          {ledger.entries.map((e, i) => (
                            <div key={i} className="space-y-1.5 p-3">
                              <div className="flex items-start justify-between gap-2">
                                <p className="min-w-0 text-sm font-medium text-gray-900">{e.description}</p>
                                <p className="shrink-0 text-xs text-gray-500">{fmtDate(e.date)}</p>
                              </div>
                              <div className="flex flex-wrap gap-3 text-xs">
                                {e.debit > 0 && <span className="font-medium text-red-600">Debit: {fmt(e.debit)}</span>}
                                {e.credit > 0 && <span className="font-medium text-green-600">Credit: {fmt(e.credit)}</span>}
                                <span className="font-semibold text-gray-900">Bal: {fmt(e.runningBalance)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="hidden overflow-x-auto md:block">
                          <table className="w-full text-sm">
                            <thead><tr className="border-b bg-gray-50">
                              <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Description</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-gray-500">Debit</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-gray-500">Credit</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-gray-500">Balance</th>
                            </tr></thead>
                            <tbody className="divide-y divide-gray-100">
                              {ledger.entries.map((e, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                  <td className="whitespace-nowrap px-4 py-2 text-gray-700">{fmtDate(e.date)}</td>
                                  <td className="px-4 py-2 text-gray-900">{e.description}</td>
                                  <td className="px-4 py-2 text-right font-medium text-red-600">{e.debit > 0 ? fmt(e.debit) : ''}</td>
                                  <td className="px-4 py-2 text-right font-medium text-green-600">{e.credit > 0 ? fmt(e.credit) : ''}</td>
                                  <td className="px-4 py-2 text-right font-semibold text-gray-900">{fmt(e.runningBalance)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </>
            )}
          </>
        )}

        {/* Fallback: no registrationId → simple display */}
        {!registrationId && (
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-400">Amount</span><p className="font-medium text-gray-900">{fmt(totalAmount || paymentAmount)}</p></div>
              <div><span className="text-gray-400">Status</span><p className={`font-medium ${pst.text}`}>{paymentStatus || 'Pending'}</p></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
