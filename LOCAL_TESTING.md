# Digital Xerox — Local Multi-User Testing Guide

**Last Updated:** 2026-09-11  
**Prerequisites:** Complete `LOCAL_SETUP.md` first. Backend + Frontend running.

---

## Test Accounts (Seeded)

| Role | Email | Password | Base URL |
|------|-------|----------|----------|
| Student | `gangadhar@mlrit.ac.in` | `demo1234` | http://localhost:5173/student |
| Staff | `scope@mlrit.ac.in` | `demo1234` | http://localhost:5173/staff |
| Admin | `mlrit@mlrit.ac.in` | `demo1234` | http://localhost:5173/admin |

---

## Browser Setup

Open **three separate browser profiles / incognito windows**:

| Window | Profile | Purpose |
|--------|---------|---------|
| **Window 1** | Incognito / Profile 1 | Student (Gangadhar) |
| **Window 2** | Incognito / Profile 2 | Staff (Scope) |
| **Window 3** | Incognito / Profile 3 | Admin (MLRIT) |

> Using separate profiles prevents cookie/session interference.

---

## Test Scenario A: Complete Order Lifecycle (Happy Path)

### Step 1 — Student Creates Order (Window 1)

1. Open http://localhost:5173 → Click **Login** → Enter `gangadhar@mlrit.ac.in` / `demo1234`
2. Land on **Student Dashboard** → Click **"New Order"**
3. **Step 1: Upload Document**
   - Drag/drop or click to upload a test PDF (e.g., `test-document.pdf`, < 25MB)
   - Verify: File name appears, page count extracted (exact for PDF)
   - Click **Next**
4. **Step 2: Configure Print**
   - Service Type: **Printing**
   - Paper Size: **A4**
   - Color Mode: **Black & White**
   - Sides: **Double-sided**
   - Page Range: **All** (or custom like `1-3,5`)
   - Copies: **2** (use stepper)
   - Verify: Live quote updates (bottom right)
   - Click **Next**
5. **Step 3: Stationery** (Optional)
   - Add 1x "A4 Paper Pack" or any available product
   - Verify: Quote updates with stationery cost
   - Click **Next**
6. **Step 4: Review**
   - Verify: All settings, document preview, total amount
   - Click **Place Order**
7. **Step 5: Payment**
   - Select **UPI** (or CARD/CASH)
   - Click **Pay ₹XXX**
   - Verify: Success toast, order token displayed (e.g., `XR-001`)
   - Click **Track Order**
8. **Step 6: Tracking Page**
   - Verify: Order shows **RECEIVED** status
   - Note: **Token** (e.g., `XR-001`), **Queue Position**, **Estimated Wait**
   - Keep this window open

**✓ Student Order Created — Token: `XR-XXX`**

---

### Step 2 — Staff Sees Order in Queue (Window 2)

1. Open http://localhost:5173  → Login as `scope@mlrit.ac.in` / `demo1234`
2. Land on **Staff Dashboard** → **Queue** tab
3. Verify:
   - **Now Serving** token matches student's token
   - Queue shows the new order at correct position
   - Columns: Token, Student, Document, Service, Pages, Copies, Payment, Waiting Time
4. Click the order row → **Order Detail** page opens
5. Verify:
   - Student name / ID displayed
   - Document accessible (click **View Document** → PDF opens in new tab)
   - Print settings match student selection
   - Payment status: **Paid** (or Unpaid if CASH)
   - Status badge: **RECEIVED** (pulsing)

---

### Step 3 — Staff Starts Processing (Window 2)

1. On Order Detail page → Click **Start Processing**
2. Verify:
   - Toast: "Order moved to PROCESSING"
   - Status badge changes to **PROCESSING** (pulsing)
   - Status history shows transition with timestamp
3. Switch to **Window 1 (Student)** → Refresh tracking page
4. Verify: Student sees **PROCESSING** status (no manual refresh needed — polls every 10s)

---

### Step 4 — Staff Marks Ready (Window 2)

1. On Order Detail page → Click **Mark Ready**
2. Verify:
   - Toast: "Order marked READY for collection"
   - Status badge changes to **READY** (green)
3. Switch to **Window 1 (Student)** → Refresh
4. Verify: Student sees **READY** status, "Ready for collection" message

---

### Step 5 — Staff Completes Order (Window 2)

1. On Order Detail page → Click **Complete Order**
2. Verify:
   - Toast: "Order completed"
   - Order disappears from active queue
   - Appears in **Completed** tab
3. Switch to **Window 1 (Student)** → Refresh
4. Verify: Student sees **COMPLETED** status with completion timestamp

**✓ Complete Lifecycle Verified**

---

## Test Scenario B: Order Rejection & Refund

### Step 1 — Student Creates New Order (Window 1)

1. Repeat **Scenario A Steps 1-7** (create new order, pay via UPI/CARD)
2. Note new token (e.g., `XR-002`)

### Step 2 — Staff Rejects Order (Window 2)

1. Open order detail for `XR-002`
2. Click **Reject Order**
3. Enter reason: **"Document unreadable — please re-upload"**
4. Click **Confirm Rejection**
5. Verify:
   - Toast: "Order rejected"
   - Status badge: **REJECTED** (red)
   - Stationery stock restored (if any)
   - Payment status: **REFUNDED** (for UPI/CARD)
   - Audit log entry created

### Step 3 — Student Sees Rejection (Window 1)

1. Refresh tracking page for `XR-002`
2. Verify:
   - Status: **REJECTED**
   - Rejection reason displayed
   - Notification bell shows **unread count** (red dot)
   - Click bell → Notification: "Your order was rejected: Document unreadable — please re-upload"
   - Click notification → Navigates to order detail

**✓ Rejection + Refund + Notification Verified**

---

## Test Scenario C: Admin Operations (Window 3)

### Step 1 — Admin Dashboard Overview

1. Login as `mlrit@mlrit.ac.in` / `demo1234`
2. Land on **Admin Overview**
3. Verify metrics panels:
   - **Today / Week / Month** selector works (dropdown)
   - Orders, Completed, Rejected, Revenue (₹), Avg Turnaround, Rejection Rate
   - **Orders by Hour** chart (bar)
   - **Peak Hour** displayed
   - **Service Mix** (Printing/Xerox/Stationery)
   - **Queue Performance** (avg wait, max wait, currently waiting)
   - **Low Stock Alerts** (products with stock â‰¤ minStock)
   - Shop name displayed

### Step 2 — Admin Pricing Management

1. Navigate to **Pricing** (sidebar)
2. Verify:
   - 4 rules listed: A4 B&W, A4 Colour, A3 B&W, A3 Colour
   - Each shows current rate (₹/page)
3. Click **Edit** on A4 Colour → Change rate to `3.00`
4. Click **Save**
5. Verify:
   - Toast: "Pricing updated"
   - Rate updated in table
   - **Pricing Version** incremented (shown in UI)
6. **Verify Pricing Lock:** Switch to Window 1 → Create new quote → Uses NEW rate. Existing order `XR-001` still shows OLD rate in history.

### Step 3 — Admin Products / Inventory

1. Navigate to **Products** (sidebar)
2. Verify table shows all 14 products with:
   - Name, Description, Price, Stock, Min Stock, Reserved, Available, Status
   - Status badges: **OK** (green), **Low** (amber), **Inactive** (gray)
3. **Create Product:** Click **+ Add Product**
   - Name: "Test Pen", Description: "Blue ballpoint", Price: `10.00`, Stock: `50`, Min Stock: `5`
   - Save → Verify appears in table
4. **Deactivate Product:** Click toggle on "Test Pen" → Status: **Inactive**
   - Verify: Still visible in admin table, hidden from student catalogue
5. **Update Stock:** Edit "Test Pen" → Stock: `2` (below minStock 5)
   - Verify: Status badge shows **Low** (amber)
6. **Delete Product:** Delete "Test Pen" → Verify removed

### Step 4 — Admin Staff Management

1. Navigate to **Staff** (sidebar)
2. Verify: Table shows Ravi (Counter 1, Active)
3. **Invite Staff:** Click **+ Invite Staff**
   - Name: "Priya Sharma", Email: `priya@college.edu`, Counter: "Counter 2"
   - Create → Verify: Toast with bootstrap password notice
4. **Deactivate Staff:** Click **Deactivate** on Priya → Status: **Inactive**
5. **Reset Access:** Click **Reset Access** on Priya → Confirm → Toast shows reset
   - Note: Password returns to `demo1234` (dev fixture)
6. **Reactivate:** Click **Activate** → Status: **Active**

### Step 5 — Admin Audit Log

1. Navigate to **Audits** (sidebar)
2. Verify: Table with Time, Actor, Action, Entity, Detail
3. **Search:** Type "PRICE" → Filters to price changes
4. **Search:** Type "priya" → Filters to staff actions
5. Verify: All admin actions from above appear (pricing, products, staff)

### Step 6 — Admin Orders & Settings

1. Navigate to **Orders** (if available) or verify via Overview
2. Navigate to **Settings** (if available)
   - Verify: Shop hours, service fee, discount, max pages, active orders limit editable

**✓ All Admin Operations Verified**

---

## Test Scenario D: Security & Authorization

### Test 1 — Student Cannot Access Staff Pages
- Window 1 (Student) → Navigate to `http://localhost:5173/staff`
- **Expected:** Redirected to `/student` (or login)

### Test 2 — Student Cannot Access Admin APIs
- Window 1 → Open DevTools Console → Run:
```js
fetch('http://localhost:4000/api/admin/overview', {
  headers: { Authorization: `Bearer ${localStorage.getItem('dx.session.v1')?.token}` }
}).then(r => r.json()).then(console.log)
```
- **Expected:** 403 Forbidden

### Test 3 — Staff Cannot Access Admin APIs
- Window 2 (Staff) → Same fetch to `/api/admin/overview`
- **Expected:** 403 Forbidden

### Test 4 — Admin Can Access All
- Window 3 (Admin) → Same fetch → **Expected:** 200 OK with data

### Test 5 — Document Access Control
- Window 1 (Student A) → Upload doc → Get document ID
- Window 1 (Student B) → Try to access `/api/documents/<id>/file` with Student B's token
- **Expected:** 403 Forbidden
- Window 2 (Staff) → Access same document → **Expected:** 200 OK (staff can access for active orders)

### Test 6 — Duplicate Order Prevention
- Window 1 → Create order with idempotency key (DevTools Network tab → copy `idempotencyKey` from request)
- Resend same POST with same key → **Expected:** Returns existing order, no duplicate

### Test 7 — Duplicate Payment Prevention
- Window 1 → Pay order with idempotency key
- Resend same POST → **Expected:** Returns existing payment, no double charge

### Test 8 — Invalid Status Transitions
- Window 2 (Staff) → Try to move COMPLETED order back to PROCESSING
- **Expected:** 400/409 error, toast "Invalid status transition"

---

## Test Scenario E: Edge Cases & Error States

| Test | Steps | Expected |
|------|-------|----------|
| **Empty queue** | Clear all orders (admin) → Staff views queue | "No orders in queue" empty state |
| **Empty history** | New student (register) → History tab | "No orders yet" |
| **Upload invalid file** | Student → Upload `.exe` or `.zip` | Rejected with error toast |
| **Upload oversized file** | Student → Upload >25MB PDF | Rejected with size error |
| **Fake PDF** | Student → Upload `.pdf` with wrong magic bytes | Rejected: "Invalid PDF file" |
| **Stationery out of stock** | Admin sets product stock=0 → Student tries to add | Disabled/not shown in stationery step |
| **Shop closed** | Admin sets `SHOP_CLOSED_MESSAGE` → Student tries order | Blocked with closed message |
| **Max active orders** | Student creates 3 orders without completing | 4th order blocked: "You already have active orders" |
| **Page range dedup** | Student enters `1-3,2-4` → Quote | Deduped to `1-4` |
| **Refresh persistence** | Student creates order → Hard refresh (Ctrl+Shift+R) | Order still in history, tracking works |
| **Back button** | Student on success page → Browser back | Returns to review step (no duplicate order) |
| **Logout clears session** | Student logout → Refresh → Navigate to /student | Redirected to login |

---

## Test Scenario F: Real-Time Polling Behavior

| Page | Poll Interval | Active Condition |
|------|---------------|------------------|
| Student Tracking | 10s | While order status âˆˆ {RECEIVED, PROCESSING, READY} |
| Student Notifications | 15s | Always (unread count) |
| Staff Queue | 8s | Always |
| Staff Order Detail | 8s | While order status âˆˆ {RECEIVED, PROCESSING, READY} |
| Admin Overview | 15s (today) / 60s (week/month) | Always |

**Verify:** Open DevTools Network tab → Filter "XHR" → Observe periodic requests.

---

## Test Checklist Summary

| Scenario | Status |
|----------|--------|
| A. Complete Order Lifecycle | â˜ Pass / â˜ Fail |
| B. Rejection & Refund | â˜ Pass / â˜ Fail |
| C. Admin Operations (Overview, Pricing, Products, Staff, Audits) | â˜ Pass / â˜ Fail |
| D. Security & Authorization | â˜ Pass / â˜ Fail |
| E. Edge Cases & Error States | â˜ Pass / â˜ Fail |
| F. Real-Time Polling | â˜ Pass / â˜ Fail |

---

## Known Limitations (Acceptable for Local Dev)

1. **Payment is simulated** — No real money moves. "Demo checkout" badge shown.
2. **DOCX page count is estimated** — Student must confirm.
3. **No WebSockets** — 8-30s polling intervals (configurable in hooks).
4. **No email/SMS** — In-app notifications only.
5. **Single-server JSON DB** — Not horizontally scalable.
5. **Dev credentials only** — All passwords `demo1234`.

---

## Reporting Issues

If any test fails:
1. Note the exact steps to reproduce
2. Check backend terminal for errors
3. Check browser DevTools Console + Network tabs
4. Verify database state: `cat backend/storage/db.json | jq .orders[]` (if jq installed)
5. Report with: Scenario, Step, Expected vs Actual, Logs

