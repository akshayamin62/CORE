import Invoice, { InvoiceType, InvoiceStatus } from '../models/Invoice';
import Ledger, { LedgerEntryType } from '../models/Ledger';
import User from '../models/User';
import Student from '../models/Student';
import InvoiceSequence from '../models/InvoiceSequence';
import ServicePricing from '../models/ServicePricing';

// Default GST rate (%) used when an admin/advisor hasn't configured a custom one.
export const DEFAULT_GST_RATE = 18;

// Resolve the configured GST rate (%) for a given admin/advisor + service.
// Falls back to DEFAULT_GST_RATE when no pricing record or no custom value exists.
export const resolveGstRate = async (params: {
  adminId?: string | null;
  advisorId?: string | null;
  serviceSlug: string;
}): Promise<number> => {
  const filter = params.adminId
    ? { adminId: params.adminId, serviceSlug: params.serviceSlug }
    : params.advisorId
      ? { advisorId: params.advisorId, serviceSlug: params.serviceSlug }
      : null;
  if (!filter) return DEFAULT_GST_RATE;
  const pricing = await ServicePricing.findOne(filter).select('gstPercentage').lean();
  const rate = pricing?.gstPercentage;
  return typeof rate === 'number' && rate >= 0 ? rate : DEFAULT_GST_RATE;
};

// ===== Invoice Number Generation =====
// Uses InvoiceSequence as an atomic counter ($inc + upsert).
// On first use (or after a DB reset), the counter is automatically synced to the
// highest existing invoice number so it never collides with existing records.

const syncSequenceToExisting = async (counterId: string, prefix: string, year: number): Promise<void> => {
  // Find the highest seq already stored in the invoices collection for this prefix+year
  const pattern = `^${prefix}-${year}-`;
  const latest = await Invoice.findOne(
    { invoiceNumber: { $regex: pattern } },
    { invoiceNumber: 1 }
  ).sort({ invoiceNumber: -1 }).lean();

  if (!latest) return;

  const parts = (latest.invoiceNumber as string).split('-');
  const maxSeq = parseInt(parts[parts.length - 1], 10);
  if (isNaN(maxSeq) || maxSeq <= 0) return;

  // Only advance the counter — never go backwards
  await InvoiceSequence.updateOne(
    { _id: counterId, seq: { $lt: maxSeq } },
    { $set: { seq: maxSeq } },
    { upsert: false }
  );
};

export const generateInvoiceNumber = async (type: InvoiceType): Promise<string> => {
  const prefix = type === InvoiceType.PROFORMA ? 'KS-PF' : 'KS-INV';
  const year = new Date().getFullYear();
  const counterId = `${prefix}-${year}`;

  // Upsert the counter doc (creates with seq:0 if absent)
  const before = await InvoiceSequence.findOneAndUpdate(
    { _id: counterId },
    { $setOnInsert: { seq: 0 } },
    { new: false, upsert: true }
  );

  // If the doc was just created (before was null), sync it with whatever invoices
  // already exist so the very first generated number is always safe.
  if (!before) {
    await syncSequenceToExisting(counterId, prefix, year);
  }

  // Atomically increment and return the next value
  const counter = await InvoiceSequence.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true }
  );

  return `${prefix}-${year}-${String(counter!.seq).padStart(5, '0')}`;
};

const isDuplicateInvoiceNumberError = (error: any): boolean => {
  return error?.code === 11000 && error?.keyPattern?.invoiceNumber === 1;
};

// Retry wrapper: if despite the sync we somehow still collide (e.g. two simultaneous
// first-time calls), resync and try again up to 3 more times.
const createInvoiceWithRetry = async (
  type: InvoiceType,
  payload: Record<string, any>,
  maxAttempts = 4
) => {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const invoiceNumber = await generateInvoiceNumber(type);
      return await Invoice.create({
        ...payload,
        invoiceNumber,
        type,
      });
    } catch (error: any) {
      lastError = error;
      if (!isDuplicateInvoiceNumberError(error) || attempt === maxAttempts) {
        throw error;
      }
      // Re-sync the counter so subsequent attempts jump past all existing numbers
      const prefix = type === InvoiceType.PROFORMA ? 'KS-PF' : 'KS-INV';
      const year = new Date().getFullYear();
      await syncSequenceToExisting(`${prefix}-${year}`, prefix, year);
    }
  }

  throw lastError;
};

// ===== Create Proforma Invoice =====

export const createProformaInvoice = async (params: {
  registrationId: string;
  studentId: string;
  adminId?: string;
  advisorId?: string;
  serviceName: string;
  serviceSlug: string;
  planTier: string;
  totalAmount: number;
  discountAmount?: number;
  installmentNumber?: number;
  installmentPercentage?: number;
  installmentAmount?: number;
  gstRate?: number;
}): Promise<any> => {
  const student = await Student.findById(params.studentId).populate('userId').lean();
  const studentUser = student?.userId as any;

  const discountAmt = params.discountAmount || 0;
  // GST rate is configurable per admin/advisor + service (defaults to 18%)
  const gstRate = params.gstRate ?? DEFAULT_GST_RATE;
  // totalAmount is GST-inclusive — reverse-calculate base (same as createTaxInvoice)
  const grandTotal = params.totalAmount - discountAmt;
  const taxableAmount = Math.round(grandTotal * 100 / (100 + gstRate));
  const gstAmount = grandTotal - taxableAmount;

  const invoice = await createInvoiceWithRetry(InvoiceType.PROFORMA, {
    registrationId: params.registrationId,
    studentId: params.studentId,
    adminId: params.adminId,
    advisorId: params.advisorId,
    studentName: studentUser
      ? [studentUser.firstName, studentUser.middleName, studentUser.lastName].filter(Boolean).join(' ')
      : 'Student',
    studentEmail: studentUser?.email || '',
    studentPhone: studentUser?.mobileNumber || undefined,
    serviceName: params.serviceName,
    serviceSlug: params.serviceSlug,
    planTier: params.planTier,
    totalAmount: taxableAmount,
    discountAmount: discountAmt,
    taxableAmount,
    gstRate,
    gstAmount,
    grandTotal,
    installmentNumber: params.installmentNumber,
    installmentPercentage: params.installmentPercentage,
    installmentAmount: params.installmentAmount,
    status: InvoiceStatus.ISSUED,
    issuedAt: new Date(),
  });

  return invoice;
};

// ===== Create Tax Invoice (after payment) =====
// amount = GST-inclusive amount that was actually charged/paid

export const createTaxInvoice = async (params: {
  registrationId: string;
  paymentId: string;
  studentId: string;
  adminId?: string;
  advisorId?: string;
  serviceName: string;
  serviceSlug: string;
  planTier: string;
  amount: number; // GST-inclusive amount paid
  discountAmount?: number;
  installmentNumber?: number;
  installmentPercentage?: number;
  gstRate?: number;
}): Promise<any> => {
  const student = await Student.findById(params.studentId).populate('userId').lean();
  const studentUser = student?.userId as any;

  const GST_RATE = params.gstRate ?? DEFAULT_GST_RATE;
  // Reverse-calculate base from GST-inclusive amount
  const grandTotal = params.amount;
  const taxableAmount = Math.round(grandTotal * 100 / (100 + GST_RATE));
  const gstAmount = grandTotal - taxableAmount;

  const invoice = await createInvoiceWithRetry(InvoiceType.TAX_INVOICE, {
    registrationId: params.registrationId,
    paymentId: params.paymentId,
    studentId: params.studentId,
    adminId: params.adminId,
    advisorId: params.advisorId,
    studentName: studentUser
      ? [studentUser.firstName, studentUser.middleName, studentUser.lastName].filter(Boolean).join(' ')
      : 'Student',
    studentEmail: studentUser?.email || '',
    studentPhone: studentUser?.mobileNumber || undefined,
    serviceName: params.serviceName,
    serviceSlug: params.serviceSlug,
    planTier: params.planTier,
    totalAmount: taxableAmount,
    discountAmount: params.discountAmount || 0,
    taxableAmount,
    gstRate: GST_RATE,
    gstAmount,
    grandTotal,
    installmentNumber: params.installmentNumber,
    installmentPercentage: params.installmentPercentage,
    installmentAmount: grandTotal,
    status: InvoiceStatus.PAID,
    issuedAt: new Date(),
    paidAt: new Date(),
  });

  return invoice;
};

// ===== Ledger Operations =====

export const createOrUpdateLedger = async (params: {
  registrationId: string;
  studentId: string;
  totalServiceAmount: number;
  discountAmount?: number;
  entry: {
    type: LedgerEntryType;
    description: string;
    invoiceId?: string;
    paymentId?: string;
    debit: number;
    credit: number;
  };
}): Promise<any> => {
  let ledger = await Ledger.findOne({ registrationId: params.registrationId });

  const discountAmt = params.discountAmount || 0;
  const netPayable = params.totalServiceAmount - discountAmt;

  if (!ledger) {
    // Create new ledger
    const runningBalance = params.entry.debit - params.entry.credit;
    ledger = await Ledger.create({
      registrationId: params.registrationId,
      studentId: params.studentId,
      totalServiceAmount: params.totalServiceAmount,
      totalDiscount: discountAmt,
      netPayable,
      totalPaid: params.entry.credit,
      balance: netPayable - params.entry.credit,
      entries: [
        {
          date: new Date(),
          type: params.entry.type,
          description: params.entry.description,
          invoiceId: params.entry.invoiceId,
          paymentId: params.entry.paymentId,
          debit: params.entry.debit,
          credit: params.entry.credit,
          runningBalance,
        },
      ],
    });
  } else {
    // Get last running balance
    const lastBalance =
      ledger.entries.length > 0
        ? ledger.entries[ledger.entries.length - 1].runningBalance
        : 0;

    const newRunningBalance = lastBalance + params.entry.debit - params.entry.credit;

    ledger.entries.push({
      date: new Date(),
      type: params.entry.type,
      description: params.entry.description,
      invoiceId: params.entry.invoiceId as any,
      paymentId: params.entry.paymentId as any,
      debit: params.entry.debit,
      credit: params.entry.credit,
      runningBalance: newRunningBalance,
    });

    // Update totals
    if (params.entry.type === LedgerEntryType.PAYMENT) {
      ledger.totalPaid += params.entry.credit;
    }
    if (params.entry.type === LedgerEntryType.DISCOUNT) {
      ledger.totalDiscount += params.entry.credit;
      ledger.netPayable = ledger.totalServiceAmount - ledger.totalDiscount;
    }
    ledger.balance = ledger.netPayable - ledger.totalPaid;

    await ledger.save();
  }

  return ledger;
};

// ===== Get installment schedule for study abroad =====

export const buildInstallmentSchedule = (totalAmount: number) => {
  const inst1 = Math.round(totalAmount * 0.50);
  const inst2 = Math.round(totalAmount * 0.30);
  const inst3 = totalAmount - inst1 - inst2; // remainder to avoid rounding issues

  return {
    totalInstallments: 3,
    completedInstallments: 0,
    schedule: [
      { number: 1, percentage: 50, amount: inst1, status: 'pending' as string, label: undefined as string | undefined, paidAt: undefined as Date | undefined, razorpayOrderId: undefined as string | undefined },
      { number: 2, percentage: 30, amount: inst2, status: 'pending' as string, label: undefined as string | undefined, paidAt: undefined as Date | undefined, razorpayOrderId: undefined as string | undefined },
      { number: 3, percentage: 20, amount: inst3, status: 'pending' as string, label: undefined as string | undefined, paidAt: undefined as Date | undefined, razorpayOrderId: undefined as string | undefined },
    ],
  };
};
