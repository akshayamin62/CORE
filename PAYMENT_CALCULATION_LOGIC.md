# Payment & Accounting Calculation Logic

> Full end-to-end reference for all financial calculations across all services.
> Last updated: March 30, 2026

---

## 1. Data Sources

| Data | Model | Key Fields |
|---|---|---|
| Plan base prices | `ServicePricing` | `prices: { PRO, PREMIUM, PLATINUM }` — **pre-GST** INR amounts set by admin |
| Student discounts | `StudentPlanDiscount` | `planTier`, `type` (percentage/fixed), `value`, `calculatedAmount` (INR) |
| Registration | `StudentServiceRegistration` | `planTier`, `totalAmount` (base price), `totalPaid`, `installmentPlan`, `paymentComplete` |
| Payments | `Payment` | `amountInr` (GST-inclusive amount actually charged), `status` |
| Invoices | `Invoice` | `type` (PROFORMA/TAX_INVOICE), `taxableAmount`, `gstAmount`, `grandTotal` |
| Ledger | `Ledger` | `totalServiceAmount`, `netPayable`, `totalPaid`, `balance`, `entries[]` |

---

## 2. Core Pricing Formula

Applies consistently at **every** calculation step:

```
basePrice        =  ServicePricing.prices[planTier]         (pre-GST, set by admin)
discountAmt      =  StudentPlanDiscount.calculatedAmount     (0 if no discount)
netBase          =  max(0, basePrice - discountAmt)          (pre-GST, after discount)
gstAmount        =  round(netBase × 18 / 100)               (18% GST)
netPayableTotal  =  netBase + gstAmount                      (GST-inclusive total)
```

**GST Rate:** 18% on all services.

---

## 3. Invoice GST Calculation

### Proforma Invoice (`createProformaInvoice`)

Input `totalAmount` is **GST-inclusive**. The function reverse-calculates:

```
grandTotal    =  totalAmount   (GST-inclusive input)
taxableAmount =  round(grandTotal × 100 / 118)
gstAmount     =  grandTotal - taxableAmount
```

Stored in DB: `totalAmount = taxableAmount`, `gstAmount`, `grandTotal`.

### Tax Invoice (`createTaxInvoice`)

Same reverse-calculation from GST-inclusive `amount`:

```
grandTotal    =  amount        (GST-inclusive, what was actually charged)
taxableAmount =  round(grandTotal × 100 / 118)
gstAmount     =  grandTotal - taxableAmount
```

> **Rule:** Never add GST on top of an already-GST-inclusive amount. Always reverse-calculate.

---

## 4. Service-by-Service Registration Flow

### 4.1 Study Abroad — Installment (50 / 30 / 20)

#### Step 1: Student clicks "Register" → `POST /payments/create-registration-order`

```
basePrice       = ServicePricing.prices["PRO" | "PREMIUM" | "PLATINUM"]
discountAmt     = StudentPlanDiscount.calculatedAmount  (0 if none)
netBase         = basePrice - discountAmt
gstAmount       = round(netBase × 18 / 100)
netPayableTotal = netBase + gstAmount      ← full commitment

chargeNow       = round(netPayableTotal × 50%)  ← installment #1 (50%)
```

Razorpay order created for `chargeNow`. Order notes store: `basePrice`, `discountAmt`, `netPayableTotal`, `planTier`, `serviceSlug`, `studentId`.

#### Step 2: Student pays → `POST /payments/verify-registration`

1. **Registration created** with:
   - `totalAmount = basePrice` (base, pre-GST)
   - `paymentModel = 'installment'`
   - `totalPaid = chargeNow` (50% of netPayableTotal)
   - `paymentStatus = 'partial'`
   - `paymentComplete = false`

2. **Installment schedule** built from `netPayableTotal`:

   | # | % | Amount (GST-incl.) | Status |
   |---|---|---|---|
   | 1 | 50% | `round(netPayableTotal × 50%)` | `paid` |
   | 2 | 30% | `round(netPayableTotal × 30%)` | `due` |
   | 3 | 20% | `netPayableTotal − inst1 − inst2` | `pending` |

3. **Proforma Invoice**: `totalAmount = netPayableTotal` (full service plan amount, GST-inclusive)

4. **Tax Invoice**: `amount = chargeNow` (50% actually paid, GST-inclusive)

5. **Ledger**:
   - Entry 1 (INVOICE/Debit): `netPayableTotal` — full service charge
   - Entry 2 (PAYMENT/Credit): `chargeNow` — 50% received
   - `balance = netPayableTotal − chargeNow` (remaining 50%)

---

#### Step 3: Student pays installment #2 → `POST /payments/create-order` + `POST /payments/verify`

```
amountInr = schedule[1].amount  =  round(netPayableTotal × 30%)
```

- **Tax Invoice**: `amount = inst2Amount`
- **Ledger**: Credit  `inst2Amount`
- `totalPaid += inst2Amount`
- Schedule: inst2 → `paid`, inst3 → `due`

---

#### Step 4: Student pays installment #3 → `POST /payments/create-order` + `POST /payments/verify`

```
amountInr = schedule[2].amount  =  netPayableTotal − inst1 − inst2
```

- **Tax Invoice**: `amount = inst3Amount`
- **Ledger**: Credit `inst3Amount`
- `totalPaid = netPayableTotal`
- `paymentComplete = true`, `paymentStatus = 'paid'`

---

### 4.2 Education Planning — One-Time Full Payment

#### Step 1: `POST /payments/create-registration-order`

```
basePrice       = ServicePricing.prices[planTier]
discountAmt     = StudentPlanDiscount.calculatedAmount
netBase         = basePrice - discountAmt
gstAmount       = round(netBase × 18 / 100)
netPayableTotal = netBase + gstAmount

chargeNow = netPayableTotal   ← 100% upfront
```

#### Step 2: `POST /payments/verify-registration`

1. **Registration**: `paymentModel = 'one-time'`, `paymentComplete = true`, `totalPaid = netPayableTotal`

2. **Proforma Invoice**: `totalAmount = netPayableTotal`

3. **Tax Invoice**: `amount = netPayableTotal`

4. **Ledger**:
   - Debit: `netPayableTotal`
   - Credit: `netPayableTotal`
   - `balance = 0`

---

### 4.3 Coaching Classes — One-Time Full Payment (per plan/batch)

Same as Education Planning (4.2). Each coaching class plan is an independent registration (multiple registrations allowed per student for different plan tiers).

Coaching-specific: a `classTiming` object is passed in the order notes (`batchDate`, `timeFrom`, `timeTo`) and saved to the registration.

---

## 5. Upgrade Flow (Study Abroad & Education Planning)

### 5.1 Upgrade Difference Calculation → `POST /payments/create-upgrade-order`

```
── New Plan ──
newBasePrice  = ServicePricing.prices[newPlanTier]
newDiscountAmt = StudentPlanDiscount.calculatedAmount for newPlanTier  (0 if none)
newNetBase    = newBasePrice - newDiscountAmt
newGst        = round(newNetBase × 18 / 100)
newNetPayable = newNetBase + newGst

── Old Plan (what student was on) ──
oldBasePrice  = ServicePricing.prices[oldPlanTier]
oldDiscountAmt = StudentPlanDiscount.calculatedAmount for oldPlanTier  (0 if none)
oldNetBase    = oldBasePrice - oldDiscountAmt
oldGst        = round(oldNetBase × 18 / 100)
oldNetPayable = oldNetBase + oldGst

── Plan Difference ──
planDifference = newNetPayable - oldNetPayable
```

**What to charge now (upgradeDifference):**

```
percentPaid         = sum of % of regular paid installments
                      (e.g. 50 if only inst1 paid; 80 if inst1+inst2 paid; 100 if all paid)
alreadyPaid         = registration.totalPaid
newPlanAtSamePercent = round(newNetPayable × percentPaid / 100)

upgradeDifference   = max(0, newPlanAtSamePercent - alreadyPaid)
```

**Example:**

| | PRO (old) | PREMIUM (new) |
|---|---|---|
| Base price | ₹70,000 | ₹1,00,000 |
| Discount | ₹20,000 | ₹0 |
| Net base | ₹50,000 | ₹1,00,000 |
| GST (18%) | ₹9,000 | ₹18,000 |
| Net payable | ₹59,000 | ₹1,18,000 |

Student had paid inst1 (50% of ₹59,000 = ₹29,500):

```
percentPaid          = 50%
newPlanAtSamePercent = round(1,18,000 × 50%) = ₹59,000
upgradeDifference    = ₹59,000 − ₹29,500    = ₹29,500   ← charged now
planDifference       = ₹1,18,000 − ₹59,000  = ₹59,000   ← proforma + ledger debit
```

### 5.2 Frontend Upgrade Display

The UI shows `+₹X upgrade difference` using `getUpgradePriceDiff()`:

```
currentNet = pricing[currentPlanTier] - (discounts[currentPlanTier]?.calculatedAmount || 0)
targetNet  = pricing[planKey]         - (discounts[planKey]?.calculatedAmount || 0)
displayDiff = targetNet - currentNet
```

> ⚠️ This is the **base price difference (pre-GST)**. The actual charge via Razorpay (`upgradeDifference`) is GST-inclusive and percentage-adjusted.

### 5.3 After Upgrade Payment Verified → `POST /payments/verify-upgrade`

1. **Registration updated**:
   - `planTier = newPlanTier`
   - `totalAmount = newBasePrice`
   - `totalPaid += upgradeDifference`

2. **Installment schedule rebuilt** (study-abroad only):

   New schedule from `newNetPayable` (50/30/20 split).
   
   For previously paid regular installments:
   - `status = 'paid'` ✓
   - **`amount` = original paid amount** (preserved — NOT overwritten with new plan's amount)
   - `paidAt` and `razorpayOrderId` preserved

   New upgrade entry appended:

   | # | Label | Amount | Status |
   |---|---|---|---|
   | 101 (or 102...) | `Upgrade to PREMIUM` | `upgradeDifference` | `paid` |

   Final schedule order: `[...paidRegular, ...allUpgradeEntries, ...pendingRegular]`

3. **Tax Invoice**: `amount = upgradeDifference` (what was actually paid)

4. **Proforma Invoice**: `totalAmount = planDifference = newNetPayable - oldNetPayable`
   - Represents the full additional commitment from upgrading plans

5. **Ledger**:

   | Entry | Type | Debit | Credit | Description |
   |---|---|---|---|---|
   | Upgrade charge | INVOICE | `planDifference` | 0 | Full additional commitment from upgrade |
   | Payment received | PAYMENT | 0 | `upgradeDifference` | Actual payment made |

   Ledger totals updated:
   - `totalServiceAmount = newNetPayable`
   - `netPayable = newNetPayable`
   - `balance = newNetPayable - totalPaid` (remaining on new plan)

---

## 6. Ledger Logic

### Structure

```
Ledger
├── totalServiceAmount   ← full GST-inclusive plan price
├── totalDiscount        ← total discount credits applied
├── netPayable           ← totalServiceAmount - totalDiscount
├── totalPaid            ← sum of all PAYMENT credits
├── balance              ← netPayable - totalPaid
└── entries[]
    ├── date
    ├── type             (INVOICE | PAYMENT | DISCOUNT | REFUND)
    ├── description
    ├── debit            (amount owed/charged)
    ├── credit           (amount paid/credited)
    └── runningBalance   (cumulative: prev + debit - credit)
```

### Ledger entries per event

| Event | Entry Type | Debit | Credit |
|---|---|---|---|
| Registration | INVOICE | `netPayableTotal` | 0 |
| Registration payment | PAYMENT | 0 | `chargeNow` |
| Installment #N payment | PAYMENT | 0 | `instAmount` |
| Upgrade | INVOICE | `planDifference` | 0 |
| Upgrade payment | PAYMENT | 0 | `upgradeDifference` |
| Discount applied | DISCOUNT | 0 | `discountAmt` |

### Running Balance interpretation

`runningBalance > 0` → student owes money (debit > credit so far)  
`runningBalance = 0` → fully paid  
`runningBalance < 0` → overpaid / credit balance

---

## 7. Document Lifecycle

| Document | When Created | Amount |
|---|---|---|
| **Proforma Invoice** (KS-PF-...) | On registration | Full `netPayableTotal` — shows full commitment |
| **Proforma Invoice** (upgrade) | On plan upgrade | `planDifference = newNetPayable - oldNetPayable` |
| **Tax Invoice** (KS-INV-...) | After each payment | Exact GST-inclusive amount paid |

Proforma = Intent to pay / full commitment.  
Tax Invoice = Evidence of actual payment received.

---

## 8. Key Invariants to Always Maintain

1. **All stored monetary amounts must be GST-inclusive** unless the field explicitly says "base" or "pre-GST".
2. **Never add GST on top of an already-GST-inclusive amount.** Always reverse-calculate: `taxable = round(total × 100/118)`.
3. **Upgrade proforma = plan price difference** (`newNetPayable - oldNetPayable`), NOT remaining balance.
4. **After upgrade, preserve original paid amounts** in the installment schedule. Only future unpaid installments use the new plan's amounts.
5. **`oldNetPayable` for upgrade** must apply the old plan's student discount, same as the new plan does.
6. **`planDifference`** (used for ledger debit and proforma) ≠ `upgradeDifference` (actual Razorpay charge). They are equal only when 100% of the old plan has been paid.
