 # Payment System Workflow — Razorpay Integration

## Current System State

### What Exists
- **Pricing Architecture**: Two-tier system — SuperAdmin sets base/MRP prices, each Admin sets their own selling prices per service per plan tier
- **Registration**: `POST /api/service-plans/:serviceSlug/register` auto-sets `paymentAmount` from admin pricing
- **Payment Fields on Registration**: `paymentStatus` (string), `paymentAmount` (number), `paymentDate` (Date) — all currently manual, no gateway
- **No payment gateway, no discount system, no invoice system**

### Services & Plans
| Service | Slug | Plan Tiers | Payment Model |
|---------|------|-----------|---------------|
| Study Abroad | `study-abroad` | PRO, PREMIUM, PLATINUM | **Installments**: 50% → 30% → 20% |
| Education Planning | `education-planning` | PRO, PREMIUM, PLATINUM | **One-time** full payment |
| Coaching Classes | `coaching-classes` | IELTS, GRE, GMAT, SAT, PTE, etc. | **One-time** full payment |

---

## Proposed Architecture

### 1. New Database Models

#### A. `Payment` (core transaction record)
```
Payment {
  _id: ObjectId
  registrationId: ObjectId → StudentServiceRegistration
  studentId: ObjectId → Student
  adminId: ObjectId → User (the admin who owns this student)
  
  // Razorpay
  razorpayOrderId: String (Razorpay order_id)
  razorpayPaymentId: String (Razorpay payment_id, set after success)
  razorpaySignature: String (for verification)
  
  // Amount
  amount: Number (amount for THIS payment in paise, Razorpay uses paise)
  amountInr: Number (amount in INR for display)
  currency: String (default: 'INR')
  
  // Installment tracking (for Study Abroad)
  installmentNumber: Number (1, 2, or 3 for study-abroad; 1 for one-time)
  installmentPercentage: Number (50, 30, or 20 for study-abroad; 100 for one-time)
  
  // Status
  status: Enum ['created', 'authorized', 'captured', 'failed', 'refunded']
  paidAt: Date
  
  // Discount applied to this payment
  discountAmount: Number (if any discount applied)
  discountType: String ('percentage' | 'fixed')
  discountValue: Number (the original input: e.g., 10 for 10% or 5000 for ₹5000)
  
  // Metadata
  description: String
  notes: Object (free-form, passed to Razorpay)
  
  createdAt, updatedAt (timestamps)
}
```

#### B. `Invoice` (generated after successful payment)
```
Invoice {
  _id: ObjectId
  invoiceNumber: String (unique, auto-generated: e.g., "KS-INV-2026-00001")
  type: Enum ['proforma', 'tax-invoice']
  
  registrationId: ObjectId → StudentServiceRegistration
  paymentId: ObjectId → Payment (null for proforma)
  studentId: ObjectId → Student
  adminId: ObjectId → User
  
  // Student details snapshot (frozen at invoice time)
  studentName: String
  studentEmail: String
  studentPhone: String
  studentAddress: String
  
  // Admin/Company details snapshot
  companyName: String
  companyAddress: String
  companyGSTIN: String (if applicable)
  
  // Service details
  serviceName: String
  serviceSlug: String
  planTier: String
  
  // Amounts
  totalAmount: Number (full service cost)
  discountAmount: Number
  taxableAmount: Number (totalAmount - discountAmount)
  gstRate: Number (e.g., 18)
  gstAmount: Number
  grandTotal: Number (taxableAmount + gstAmount)
  
  // For installment invoices
  installmentNumber: Number
  installmentPercentage: Number
  installmentAmount: Number (what's due in this invoice)
  
  // Status
  status: Enum ['draft', 'issued', 'paid', 'cancelled', 'void']
  issuedAt: Date
  paidAt: Date
  dueDate: Date
  
  // PDF
  pdfPath: String (path to generated PDF)
  
  createdAt, updatedAt
}
```

#### C. `Ledger` (running account of all transactions per registration)
```
Ledger {
  _id: ObjectId
  registrationId: ObjectId → StudentServiceRegistration (unique)
  studentId: ObjectId → Student
  
  totalServiceAmount: Number (original total price)
  totalDiscount: Number
  netPayable: Number (totalServiceAmount - totalDiscount)
  totalPaid: Number (sum of all successful payments)
  balance: Number (netPayable - totalPaid)
  
  entries: [
    {
      date: Date
      type: Enum ['invoice', 'payment', 'discount', 'refund', 'adjustment']
      description: String
      invoiceId: ObjectId → Invoice (if applicable)
      paymentId: ObjectId → Payment (if applicable)
      debit: Number (charges/invoices)
      credit: Number (payments/refunds)
      runningBalance: Number
    }
  ]
  
  createdAt, updatedAt
}
```

#### D. `Discount` (personalized student discounts)
```
Discount {
  _id: ObjectId
  registrationId: ObjectId → StudentServiceRegistration
  studentId: ObjectId → Student
  adminId: ObjectId → User (admin who granted it)
  
  type: Enum ['percentage', 'fixed']
  value: Number (e.g., 10 for 10%, or 5000 for ₹5000 off)
  maxAmount: Number (cap for percentage discounts, optional)
  
  reason: String (admin's note)
  appliedTo: Enum ['total', 'last_installment', 'second_last_installment']
  
  isActive: Boolean
  createdBy: ObjectId → User
  createdAt, updatedAt
}
```

### 2. Updated `StudentServiceRegistration` Fields
Add to existing model:
```
paymentModel: Enum ['one-time', 'installment'] (auto-set based on service)
installmentPlan: {
  totalInstallments: Number (1 for one-time, 3 for study-abroad)
  completedInstallments: Number
  schedule: [
    { number: 1, percentage: 50, amount: Number, status: 'paid'|'pending'|'due', dueDate: Date, paidAt: Date },
    { number: 2, percentage: 30, amount: Number, status: 'pending', dueDate: Date },
    { number: 3, percentage: 20, amount: Number, status: 'pending', dueDate: Date },
  ]
}
totalAmount: Number (original full price before any discount)
discountedAmount: Number (final amount after discount)
totalPaid: Number (running total of paid amount)
paymentComplete: Boolean
```

---

## Workflow Flows

### Flow 1: One-Time Payment (Education Planning / Coaching Classes)

```
Student selects plan → Frontend calls POST /api/service-plans/:slug/register
  → Backend:
    1. Create StudentServiceRegistration (paymentModel: 'one-time')
    2. Look up admin pricing → set totalAmount
    3. Check if Discount exists for this student+service → apply → set discountedAmount
    4. Generate PROFORMA INVOICE (type: 'proforma', full amount)
    5. Create Razorpay Order (amount = discountedAmount in paise)
    6. Return { registration, proformaInvoice, razorpayOrder }
  
  → Frontend shows Razorpay checkout modal

  → On success, Frontend sends POST /api/payments/verify
    → Backend:
      1. Verify Razorpay signature
      2. Create Payment record (status: 'captured')
      3. Update proforma invoice → Generate TAX INVOICE (type: 'tax-invoice', status: 'paid')
      4. Create/Update Ledger (debit: invoice amount, credit: payment amount, balance: 0)
      5. Update registration: paymentStatus='Paid', paymentDate=now, totalPaid, paymentComplete=true
      6. Return { payment, invoice, ledger }
```

### Flow 2: Installment Payment — Study Abroad (50% → 30% → 20%)

#### Step A: Registration (50% payment)
```
Student selects Study Abroad plan → POST /api/service-plans/study-abroad/register
  → Backend:
    1. Create StudentServiceRegistration (paymentModel: 'installment')
    2. Look up admin pricing → set totalAmount
    3. Check Discount → apply to totalAmount → set discountedAmount
    4. Build installment schedule:
       - Installment 1: 50% of discountedAmount
       - Installment 2: 30% of discountedAmount (or adjusted if discount applies to last/second-last)
       - Installment 3: 20% of discountedAmount (or adjusted if discount applies to last)
    5. Generate PROFORMA INVOICE for FULL amount (shows total commitment)
    6. Create Razorpay Order for INSTALLMENT 1 (50% amount)
    7. Return { registration, proformaInvoice, razorpayOrder }
  
  → Razorpay checkout → Success
  → POST /api/payments/verify
    → Backend:
      1. Verify Razorpay signature
      2. Create Payment (installmentNumber: 1, amount: 50% of discountedAmount)
      3. Generate TAX INVOICE for installment 1
      4. Create Ledger with entries: [proforma debit, payment 1 credit]
      5. Update registration: paymentStatus='Partial', totalPaid, installmentPlan.schedule[0].status='paid'
```

#### Step B: Staff Triggers 30% Payment
```
Admin/Counselor clicks "Request Payment" for installment 2 → POST /api/payments/request-installment
  → Backend:
    1. Validate: installment 1 must be 'paid'
    2. Create Razorpay Order for installment 2 (30% amount)
    3. Send notification/email to student with payment link
    4. Update installmentPlan.schedule[1].status = 'due'

Student opens payment link or goes to /student/payment → clicks "Pay Now"
  → Razorpay checkout → Success
  → POST /api/payments/verify
    → Same as above but installmentNumber: 2
    → Update ledger, generate invoice
    → paymentStatus remains 'Partial' (1 installment left)
```

#### Step C: Staff Triggers 20% Payment
```
Same flow as Step B but for installment 3
  → After success:
    → paymentStatus = 'Paid', paymentComplete = true
    → Ledger balance = 0
```

### Flow 3: Discount Application (Admin Side)

```
Admin goes to student registration → "Manage Discount" section
  → POST /api/discounts
    → Body: { registrationId, type: 'percentage'|'fixed', value, appliedTo, reason }
    → Backend:
      1. Create Discount record
      2. Recalculate discountedAmount on registration
      3. If installment plan exists, adjust remaining unpaid installments
      4. Update Ledger (add 'discount' entry)
      5. If discount affects an unpaid installment Razorpay order, cancel old order + create new one

Note: Discount reduces money from LAST payment or SECOND-LAST payment.
  - For one-time: reduces the single payment
  - For installments: reduces installment 3 first, then installment 2 if needed
```

### Flow 4: Miscellaneous Collection

```
Admin creates a misc charge → POST /api/payments/misc-collection
  → Body: { studentId, registrationId (optional), description, amount }
  → Backend:
    1. Create a Razorpay Order
    2. Create a Payment record (type: 'miscellaneous')
    3. Notify student

Student pays → same verify flow
  → Generate separate TAX INVOICE
  → If linked to a registration, update that Ledger
  → If standalone, create a standalone ledger entry
```

---

## API Endpoints to Build

### Payment APIs (`/api/payments`)
| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| POST | `/create-order` | Student | Create Razorpay order for a registration payment |
| POST | `/verify` | Student | Verify Razorpay payment + update records |
| GET | `/registration/:registrationId` | Auth | Get all payments for a registration |
| GET | `/student/:studentId` | Admin,Counselor,Ops,Parent | Get all payments for a student |
| POST | `/request-installment` | Admin,Counselor | Trigger next installment payment request |
| POST | `/misc-collection` | Admin | Create misc payment request |
| GET | `/history` | Student | Get own payment history |

### Invoice APIs (`/api/invoices`)
| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| GET | `/registration/:registrationId` | Auth | Get all invoices for a registration |
| GET | `/:invoiceId` | Auth | Get single invoice |
| GET | `/:invoiceId/pdf` | Auth | Download invoice PDF |
| GET | `/student/:studentId` | Admin+ | Get all invoices for a student |
| POST | `/proforma` | System | Generate proforma (called internally) |

### Ledger APIs (`/api/ledgers`)
| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| GET | `/registration/:registrationId` | Auth | Get ledger for a registration |
| GET | `/student/:studentId` | Admin+ | Get all ledgers for a student |

### Discount APIs (`/api/discounts`)
| Method | Path | Access | Purpose |
|--------|------|--------|---------|
| POST | `/` | Admin,SuperAdmin | Create/apply discount |
| GET | `/registration/:registrationId` | Admin+ | Get discounts for a registration |
| PUT | `/:discountId` | Admin,SuperAdmin | Update discount |
| DELETE | `/:discountId` | Admin,SuperAdmin | Remove discount |

---

## Razorpay Integration Details

### What We Use from Razorpay
1. **Orders API** (`razorpay.orders.create`) — create payment order with amount
2. **Payment Verification** — HMAC SHA256 signature verification
3. **Checkout.js** (frontend) — pre-built payment modal
4. **Webhooks** (optional but recommended) — `payment.captured`, `payment.failed` events as backup

### Backend Setup
```
npm install razorpay
```

Environment variables:
```
RAZORPAY_KEY_ID=rzp_xxxx
RAZORPAY_KEY_SECRET=xxxx
RAZORPAY_WEBHOOK_SECRET=xxxx (optional)
```

### Razorpay Flow (Technical)
```
1. Frontend → POST /api/payments/create-order { registrationId, installmentNumber? }
2. Backend creates Razorpay order → returns { orderId, amount, currency, key_id }
3. Frontend opens Razorpay Checkout with orderId
4. User completes payment in Razorpay modal
5. Razorpay returns { razorpay_order_id, razorpay_payment_id, razorpay_signature }
6. Frontend → POST /api/payments/verify { order_id, payment_id, signature }
7. Backend verifies signature using HMAC SHA256:
   generated_signature = HMAC_SHA256(order_id + "|" + payment_id, KEY_SECRET)
   if (generated_signature === razorpay_signature) → payment valid
8. Backend updates Payment, Invoice, Ledger, Registration
```

---

## Frontend Pages to Build/Update

### Student Side
| Page | Purpose |
|------|---------|
| `/student/payment` (UPDATE) | Show payment history, "Pay Now" buttons for pending installments, download invoices |
| `/student/payment/[paymentId]` (NEW) | Payment receipt/details page |

### Admin/SuperAdmin Side
| Page | Purpose |
|------|---------|
| Registration page (UPDATE) | PaymentSection now shows installment progress, "Request Payment" button, discount management |
| `/admin/students/[id]/registration/[id]/invoices` (NEW) | View all invoices for a registration |
| `/admin/students/[id]/registration/[id]/ledger` (NEW) | View ledger for a registration |
| `/admin/students/[id]/registration/[id]/discount` (NEW) | Manage personalized discounts |
| `/admin/misc-collections` (NEW) | Create and track misc charges |

---

## Implementation Order (Suggested Phases)

### Phase 1: Foundation
1. Install `razorpay` package in backend
2. Create Razorpay config/utility (initialize client)
3. Create `Payment`, `Invoice`, `Ledger`, `Discount` models
4. Add new fields to `StudentServiceRegistration` model
5. Build payment controller + routes (create-order, verify)

### Phase 2: One-Time Payment Flow
6. Update `servicePlanController.registerServicePlan` to create Razorpay order
7. Build frontend Razorpay checkout integration
8. Build proforma + tax invoice generation
9. Build ledger auto-creation
10. Update student `/payment` page with "Pay Now" flow

### Phase 3: Installment Payment Flow (Study Abroad)
11. Build installment schedule logic
12. Build "Request Payment" admin action
13. Build student notification + payment link
14. Update PaymentSection to show installment progress bar

### Phase 4: Discount System
15. Build discount model, controller, routes
16. Build admin discount management UI
17. Integrate discount into payment calculation
18. Handle recalculation of unpaid installments

### Phase 5: Invoices & Ledger
19. Build invoice PDF generation (using html-pdf or puppeteer)
20. Build invoice listing + download pages
21. Build ledger view pages
22. Build invoice number auto-generation

### Phase 6: Miscellaneous Collection
23. Build misc collection creation flow
24. Build admin misc collection page
25. Link misc payments to invoices + ledger

### Phase 7: Webhooks & Reliability
26. Add Razorpay webhook endpoint for backup status sync
27. Add payment retry/expiry handling
28. Add email notifications (payment success, invoice attached)
