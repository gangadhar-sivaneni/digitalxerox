# Digital Xerox & Stationery Ordering System
## Full Implementation Plan

> A complete implementation blueprint covering the Foundation, Advanced, and AWS Production Ready solutions.

---

## 1. Project Vision

Build a campus-focused digital ordering platform where students can:

**Upload document → Select printing/Xerox requirements → Get instant price → Pay → Receive token → Track order → Collect when ready**

Shop staff can:

**Receive order → Verify → Process → Update status → Notify student → Complete order**

### Primary Goal

Eliminate unnecessary queues and physical waiting at the college Xerox/stationery shop by allowing students to complete most of the ordering process digitally and visit the shop primarily for collection.

---

# 2. Project Scope

The system is divided into three implementation levels.

## Foundation – Core Solution

- Student authentication
- Document upload
- Printing/Xerox requirement selection
- Page range selection
- Copy count
- Color/black-and-white selection
- Single/double-sided selection
- Paper size
- Automatic cost calculation
- Order/token generation
- Student order tracking
- Staff dashboard
- Order status workflow:
  - Received
  - Processing
  - Ready
  - Completed

## Advanced – Enhanced Solution

- Digital/simulated payment
- Payment tracking
- Notifications
- Queue management
- Estimated completion time
- Order history
- Multiple-order handling
- Validation
- Order rejection
- Stationery ordering
- Admin dashboard
- Pricing/product management
- Inventory
- Analytics

## Production Ready – AWS Deployment

- Containerized frontend
- Containerized backend
- Docker
- Amazon ECR
- Amazon ECS Fargate
- Amazon S3
- Amazon DynamoDB
- Amazon Cognito
- Application Load Balancer
- Amazon VPC
- IAM
- Secrets Manager
- CloudWatch
- Route 53
- HTTPS / AWS Certificate Manager
- CI/CD
- Secure document access
- Production monitoring and logging

---

# 3. User Roles

The platform should have three roles.

| Role | Responsibilities |
|---|---|
| Student | Create orders, upload documents, pay, track orders, collect orders |
| Staff | View incoming orders, access documents, verify payment, process orders, update statuses |
| Admin | Manage pricing, products, staff, shop settings, inventory, reports and system configuration |

### Initial implementation

For the MVP, implement:

- Student
- Staff

Add Admin in the Advanced phase.

---

# 4. Complete User Workflow

```text
                         STUDENT
                            |
                            v
                   Login / Register
                            |
                            v
                       New Order
                            |
                            v
                     Upload File
                            |
                            v
              Select Printing Options
                            |
                  +---------+---------+
                  |                   |
                  v                   v
               Xerox               Printing
                  |                   |
                  +---------+---------+
                            |
                            v
                    Price Calculation
                            |
                            v
                    Order Confirmation
                            |
                            v
                     Digital Payment
                            |
                            v
                    Generate Token
                            |
                            v
                   Status = RECEIVED
                            |
                            v
                    +---------------+
                    | STAFF PANEL   |
                    +---------------+
                            |
                            v
                       PROCESSING
                            |
                            v
                          READY
                            |
                            v
                   Student Notification
                            |
                            v
                       COLLECTION
                            |
                            v
                       COMPLETED
```

---

# 5. Foundation – Core Solution

## 5.1 Student Authentication

Students should be able to:

- Register
- Login
- Logout
- View profile
- Maintain basic student information

Eventually use college email verification.

Example:

```text
student@college.edu
        |
        v
Email Verification
        |
        v
Student Account
```

For the first local prototype, authentication can be mocked or implemented with a simple development authentication layer. Production authentication should use Amazon Cognito.

---

# 6. Student Dashboard

After login, the student should see a simple dashboard.

```text
+---------------------------------------+
| Digital Xerox                         |
|                                       |
| Hello, Student                        |
|                                       |
| +---------------+ +----------------+ |
| | New Order     | | Active Orders  | |
| +---------------+ +----------------+ |
|                                       |
| Recent Orders                         |
| #XR24091     Processing               |
| #XR24082     Ready                    |
+---------------------------------------+
```

Dashboard sections:

- New Order
- Active Orders
- Order History
- Notifications
- Profile

---

# 7. Create Order

The student clicks:

**+ New Order**

## Service Types

Initially support:

```text
Printing
Xerox
Stationery
```

The architecture should allow additional services later.

---

# 8. Document Upload

Students can upload:

- PDF
- DOC
- DOCX
- JPG
- JPEG
- PNG

Recommended initial limits:

```text
Maximum file size: 25 MB
Maximum files/order: 5
```

The UI should display upload status.

Example:

```text
+--------------------------------+
| Assignment.pdf                |
| 2.4 MB                        |
| 12 pages                  âœ“   |
+--------------------------------+
```

## Validation

Validate:

- File type
- MIME type
- File size
- File count
- File name
- Empty/corrupted file
- Page count where applicable

Do not trust the file extension alone.

Production should consider malware scanning before staff access.

---

# 9. Printing Requirements

After uploading a document, the student selects requirements.

## Paper Size

```text
A4
A3
```

## Color

```text
Black & White
Color
```

## Sides

```text
Single-sided
Double-sided
```

## Number of Copies

Example:

```text
Copies: [-] 2 [+]
```

## Page Range

Options:

```text
All pages
Custom pages
```

Examples:

```text
1-5
8
10-15
```

The backend must validate page ranges against the actual document page count.

Invalid example:

```text
20-10
```

for a 15-page document.

---

# 10. Stationery Ordering

The system can also support stationery.

Example products:

- Pen
- Pencil
- Notebook
- Record Book
- File
- A4 Sheets
- Chart Paper
- Marker
- Stapler
- Staples

Example order:

```text
Product          Quantity
-------------------------
Blue Pen             2
Notebook             1
A4 Sheets           20
```

The system calculates the stationery total and can combine it with printing/Xerox charges.

Example:

```text
Printing + Stationery = One Order
```

---

# 11. Dynamic Pricing Engine

The backend should calculate the final price.

Do not trust a price sent by the frontend.

Example pricing configuration:

```text
A4 B&W Single       ₹1/page
A4 B&W Double       ₹1.50/page
A4 Color Single     ₹5/page
A4 Color Double     ₹8/page
A3 B&W              ₹2/page
A3 Color            ₹10/page
```

These values should eventually be configurable through the Admin dashboard.

---

# 12. Price Calculation

Example:

```text
Document: 20 pages
Copies: 2
Color: B&W
Sides: Double-sided
Price: ₹1.50/page
```

Calculation:

```text
20 × 2 × ₹1.50 = ₹60
```

Order summary:

```text
--------------------------------
Document              20 pages
Copies                     2
Color                 B&W
Sides              Double
--------------------------------
Printing              ₹60
Stationery              ₹0
Service Fee             ₹0
--------------------------------
TOTAL                 ₹60
--------------------------------
```

The backend should recalculate the amount before creating the final order.

---

# 13. Pricing Engine Design

Create a dedicated backend pricing service.

Example conceptual function:

```text
calculatePrice(orderRequirements)
```

Inputs:

```text
serviceType
pageCount
selectedPageRange
copies
paperSize
colorMode
sides
stationeryItems
```

Output:

```text
subtotal
discount
serviceFee
total
currency
pricingVersion
```

Store the pricing version with the order so that historical orders remain understandable even if prices change later.

---

# 14. Order Validation

Before submission validate:

- User is authenticated
- File exists
- File type is supported
- File size is within limit
- Page count is available
- Page range is valid
- Copy count is valid
- Paper size is valid
- Color mode is valid
- Side selection is valid
- Stationery quantities are valid
- Products are active
- Products have enough stock
- Backend price matches current pricing rules

The frontend can provide early validation, but the backend is authoritative.

---

# 15. Order Confirmation

Before payment:

```text
+--------------------------------+
| Order Summary                  |
|                                |
| Assignment.pdf                 |
| 12 pages                       |
|                                |
| Copies: 2                      |
| Color: B&W                     |
| Sides: Double                  |
| Paper: A4                      |
|                                |
| Printing: ₹24                  |
| Stationery: ₹10                |
|                                |
| TOTAL: ₹34                     |
|                                |
| [ Proceed to Payment ]         |
+--------------------------------+
```

---

# 16. Payment System

## Foundation

Payment can be omitted or represented as an order confirmation.

## Advanced

Implement a simulated digital payment system.

Example:

```text
Payment Method

• UPI
• Card
• Cash at Counter

[Pay ₹34]
```

Demo flow:

```text
Processing Payment...
        |
        v
Payment Successful
```

Generate a transaction ID:

```text
TXN-928374
```

The UI must clearly identify simulated/demo payment as a simulation.

---

# 17. Production Payment

If real digital payments are later required, integrate an appropriate payment gateway.

The backend must:

- Create payment request
- Store payment status
- Verify gateway callback/webhook
- Prevent duplicate payment processing
- Associate payment with order
- Update order eligibility for processing

Never mark a payment successful solely because the frontend says it succeeded.

---

# 18. Order Token Generation

After successful order creation generate:

```text
Order ID:
ORD-20260910-4821

Token:
XR-184
```

The token should be:

- Unique
- Short
- Human-readable
- Easy to communicate at the counter

Examples:

```text
XR-184
XR-185
XR-186
```

A unique database order ID should still exist separately from the human-readable token.

---

# 19. Order Status

Core workflow:

```text
RECEIVED
    |
    v
PROCESSING
    |
    v
READY
    |
    v
COMPLETED
```

Additional statuses:

```text
REJECTED
CANCELLED
```

---

# 20. Order State Machine

Do not allow arbitrary status changes.

Valid transitions:

```text
RECEIVED
   |
   +----> PROCESSING
   |
   +----> REJECTED

PROCESSING
   |
   +----> READY
   |
   +----> REJECTED

READY
   |
   +----> COMPLETED
```

Invalid example:

```text
COMPLETED -> PROCESSING
```

unless an authorized admin override is implemented.

Store status history for auditing.

---

# 21. Student Order Tracking

Example:

```text
Order #XR-184

âœ“ Order Received
        |
        v
âœ“ Payment Confirmed
        |
        v
• Processing
        |
        v
• Ready
        |
        v
• Completed
```

Display:

```text
Estimated completion:
15 minutes
```

The tracking page should show:

- Token
- Order ID
- Current status
- Status history
- Payment status
- Order details
- Estimated completion
- Created time
- Last updated time
- Collection instructions

---

# 22. Staff Dashboard

Staff login opens a dedicated dashboard.

```text
+------------------------------------------------+
| Xerox Shop Dashboard                           |
+------------------------------------------------+
|                                                |
| New Orders       Processing       Ready       |
|     12               5              8         |
|                                                |
+------------------------------------------------+
| Order   Student     Type       Status          |
| XR184   Student A   Xerox      Received        |
| XR183   Student B   Print      Processing      |
| XR182   Student C   Xerox      Ready           |
+------------------------------------------------+
```

Staff dashboard should prioritize speed and readability.

---

# 23. Staff Order Card

Each order should show:

```text
XR-184

Student:
Student Name

Service:
Printing

File:
Assignment.pdf

Pages:
20

Copies:
2

Color:
B&W

Sides:
Double

Payment:
âœ“ Paid

Status:
RECEIVED

[Open Order]
```

---

# 24. Staff Order Detail

Staff can access:

- Student name
- Student ID
- File
- Printing requirements
- Page count
- Copies
- Paper size
- Amount
- Payment status
- Order time
- Token
- Estimated completion
- Status history

Actions:

```text
Start Processing
Mark Ready
Mark Completed
Reject Order
```

Only permitted actions should be shown for the current state.

---

# 25. Order Rejection

Staff can reject an order for reasons such as:

- Corrupted file
- Unsupported format
- Invalid printing instructions
- Machine unavailable
- File cannot be processed
- Invalid page selection

Reason selection:

```text
• Invalid document
• File corrupted
• Unsupported format
• Printing issue
• Other
```

Optional comment:

```text
Please upload the document again.
```

The rejection reason should be stored and displayed to the student.

---

# 26. Queue Management

For multiple simultaneous orders, use a queue.

Example:

```text
Current Queue

XR-184  Processing
XR-185  Waiting
XR-186  Waiting
XR-187  Waiting
```

Default queue strategy:

**First Come, First Served**

Later, support configurable priority if the college requires it.

Possible priority levels:

```text
NORMAL
HIGH
```

Priority must be controlled by authorized staff/admin.

---

# 27. Estimated Completion Time

Simple MVP formula:

```text
ETA =
Number of orders ahead × Average processing time
```

Example:

```text
3 orders ahead
Average processing time = 5 minutes

ETA = 15 minutes
```

Advanced ETA can consider:

- Number of pages
- Number of copies
- Printing type
- Color vs B&W
- Single vs double-sided
- Service type
- Current queue
- Number of active staff
- Machine availability

The ETA is an estimate and should be displayed as such.

---

# 28. Notifications

Notify students when:

### Order Received

> Your order XR-184 has been received.

### Processing

> Your order XR-184 is now being processed.

### Ready

> Your order XR-184 is ready for collection.

### Rejected

> Your order XR-184 was rejected. Reason: File could not be processed.

### Completed

> Order XR-184 has been completed.

---

# 29. Notification Channels

MVP:

- In-app notifications

Advanced:

- Email
- Push notifications

Production can use appropriate AWS notification services.

Avoid adding expensive SMS infrastructure unless it is actually required.

---

# 30. Order History

Student view:

```text
Order History

XR-184
₹60
Completed
10 Sep 2026

XR-173
₹40
Completed
09 Sep 2026

XR-160
₹80
Rejected
08 Sep 2026
```

Filters:

```text
All
Processing
Ready
Completed
Rejected
```

Additional filters:

- Date
- Service type
- Payment status

---

# 31. Search

Staff should be able to search by:

- Order ID
- Token
- Student name
- Student ID
- Transaction ID

Example:

```text
Search: XR-184
```

Search should be implemented through proper DynamoDB access patterns rather than scanning the entire table.

---

# 32. Filtering

Staff filters:

```text
All
Received
Processing
Ready
Completed
Rejected
Paid
Unpaid
```

Date filters:

```text
Today
Yesterday
This Week
Custom
```

---

# 33. Admin Dashboard

Admin functionality:

## Pricing

```text
A4 B&W Single     ₹1
A4 B&W Double     ₹1.50
Color A4 Single   ₹5
Color A4 Double   ₹8
```

## Products

Add/remove/edit:

```text
Pen
Notebook
Files
Paper
```

## Staff

- Add staff
- Disable staff
- Change role
- Remove staff

## Shop Configuration

```text
Shop Name
Opening Time
Closing Time
Average Processing Time
```

## Reports

- Orders
- Revenue
- Completion rate
- Rejection rate
- Popular services
- Popular stationery products

---

# 34. Database Design

Production database:

**Amazon DynamoDB**

Recommended logical entities:

```text
Users
Orders
Payments
Products
Pricing
Notifications
ShopSettings
AuditLogs
```

---

# 35. Users Table

Example:

```json
{
  "userId": "usr_123",
  "name": "Student Name",
  "email": "student@college.edu",
  "role": "STUDENT",
  "studentId": "MLR123",
  "createdAt": "2026-09-10T10:30:00Z"
}
```

Possible roles:

```text
STUDENT
STAFF
ADMIN
```

Cognito should be the authentication authority in production.

---

# 36. Orders Table

Example:

```json
{
  "orderId": "ord_184",
  "token": "XR-184",
  "userId": "usr_123",
  "status": "PROCESSING",
  "serviceType": "PRINTING",
  "fileUrl": "s3://bucket/...",
  "fileName": "assignment.pdf",
  "pageCount": 20,
  "copies": 2,
  "paperSize": "A4",
  "colorMode": "BW",
  "sides": "DOUBLE",
  "amount": 60,
  "paymentStatus": "PAID",
  "createdAt": "...",
  "updatedAt": "..."
}
```

Also store:

- Pricing version
- Status history
- Rejection reason
- Estimated completion time
- Staff identifier when processing
- Completion timestamp

---

# 37. Payment Table

Example:

```json
{
  "paymentId": "pay_123",
  "orderId": "ord_184",
  "userId": "usr_123",
  "amount": 60,
  "status": "SUCCESS",
  "method": "UPI",
  "transactionId": "TXN928374",
  "createdAt": "..."
}
```

Possible payment statuses:

```text
PENDING
SUCCESS
FAILED
REFUNDED
```

---

# 38. Products Table

Example:

```json
{
  "productId": "pen-blue",
  "name": "Blue Pen",
  "category": "STATIONERY",
  "price": 10,
  "stock": 120,
  "active": true
}
```

Track:

- Current price
- Stock
- Active/inactive state
- Category
- Updated timestamp

---

# 39. S3 Document Storage

Do not store document binaries inside DynamoDB.

Use:

**Amazon S3**

Architecture:

```text
Student
   |
   v
Frontend
   |
   v
Backend
   |
   v
Amazon S3
   |
   +-- documents/
        +-- userId/
             +-- orderId/
                  +-- document.pdf
```

DynamoDB stores document metadata and S3 object keys.

---

# 40. Secure File Access

Never make document buckets public.

Use temporary pre-signed URLs.

Workflow:

```text
Staff clicks Download
        |
        v
Backend checks authorization
        |
        v
Backend generates temporary S3 URL
        |
        v
Staff downloads document
```

The same mechanism can be used for authorized student document access where required.

---

# 41. S3 Security

Recommended configuration:

```text
Block Public Access = ON
```

Encryption:

```text
SSE-S3
```

or:

```text
SSE-KMS
```

if stronger key management is required.

Configure lifecycle policies according to college data-retention requirements.

For example:

```text
Delete completed-order documents after X days
```

The exact retention period should be decided by the college.

---

# 42. Authentication with Amazon Cognito

Production authentication:

```text
Student
   |
   v
Amazon Cognito
   |
   v
JWT Token
   |
   v
Frontend
   |
   v
Backend
   |
   v
JWT Verification
```

Roles:

```text
STUDENT
STAFF
ADMIN
```

Use college email verification where appropriate.

---

# 43. Authorization

Frontend route protection is not sufficient.

Backend must verify:

```text
Who is the user?
What role do they have?
What resource are they accessing?
Are they allowed to perform this action?
```

Example:

```text
Student A
   |
   +-- GET own order -> Allowed

Student A
   |
   +-- GET Student B's order -> Forbidden
```

Staff:

```text
View orders
Update order status
Access authorized documents
```

Admin:

```text
Pricing
Products
Staff
Reports
Settings
```

---

# 44. Backend Architecture

Recommended stack:

```text
Node.js
TypeScript
Express.js
```

Project structure:

```text
backend/
|
+-- src/
|   +-- controllers/
|   +-- services/
|   +-- routes/
|   +-- middleware/
|   +-- models/
|   +-- validators/
|   +-- utils/
|   +-- config/
|   +-- app.ts
|
+-- Dockerfile
+-- package.json
+-- tsconfig.json
```

---

# 45. Frontend Architecture

Recommended stack:

```text
React
TypeScript
Vite
```

Project structure:

```text
frontend/
|
+-- src/
    +-- components/
    +-- pages/
    +-- layouts/
    +-- hooks/
    +-- services/
    +-- utils/
    +-- types/
    +-- auth/
    +-- features/
        +-- orders/
        +-- payments/
        +-- notifications/
        +-- stationery/
```

---

# 46. Frontend Pages

```text
/
+-- Login
+-- Register
+-- Dashboard
+-- New Order
+-- Upload Document
+-- Configure Printing
+-- Order Summary
+-- Payment
+-- Order Success
+-- Track Order
+-- Order History
+-- Notifications
+-- Profile
```

---

# 47. Staff Pages

```text
/staff
+-- Dashboard
+-- Orders
+-- Order Details
+-- Queue
+-- Ready Orders
+-- Completed Orders
+-- Notifications
```

---

# 48. Admin Pages

```text
/admin
+-- Dashboard
+-- Orders
+-- Pricing
+-- Products
+-- Staff
+-- Students
+-- Reports
+-- Notifications
+-- Settings
```

---

# 49. API Design

## Authentication

For production, Cognito handles authentication. Backend exposes user/session-related endpoints where required.

```http
GET /auth/me
```

---

## Orders

```http
POST /orders
GET /orders
GET /orders/:orderId
PATCH /orders/:orderId/status
POST /orders/:orderId/reject
DELETE /orders/:orderId
```

---

## Documents

```http
POST /documents/upload-url
GET /documents/:documentId
```

---

## Pricing

```http
POST /pricing/calculate
GET /pricing
```

---

## Payments

```http
POST /payments/create
POST /payments/verify
GET /payments/:paymentId
```

---

## Notifications

```http
GET /notifications
PATCH /notifications/:id/read
```

---

## Stationery

```http
GET /products
POST /products
PATCH /products/:id
DELETE /products/:id
```

Product mutation endpoints should be Admin-only.

---

# 50. Example Order API

Request:

```json
{
  "serviceType": "PRINTING",
  "documentId": "doc_123",
  "pageRange": "1-10",
  "copies": 2,
  "paperSize": "A4",
  "colorMode": "BW",
  "sides": "DOUBLE"
}
```

Backend workflow:

```text
Validate request
      |
      v
Verify document
      |
      v
Read document metadata
      |
      v
Calculate price
      |
      v
Create order
      |
      v
Generate token
      |
      v
Create payment record
      |
      v
Return order details
```

---

# 51. Payment State Machine

```text
PENDING
   |
   +----> SUCCESS
   |
   +----> FAILED
```

For paid orders, normal processing should only begin after successful payment unless the shop explicitly supports:

```text
PAY_AT_COUNTER
```

---

# 52. Real-Time Order Updates

Advanced implementation can use WebSockets or Server-Sent Events.

Architecture:

```text
Student Order Page
        |
        v
WebSocket / SSE
        |
        v
Backend
        |
        v
Order State
```

When staff changes:

```text
PROCESSING -> READY
```

the student UI can update automatically.

## Simpler implementation

Polling every 10–30 seconds is acceptable for an MVP.

---

# 53. Notification Architecture

Possible flow:

```text
Order status changed
        |
        v
Notification Service
        |
        +----> In-app notification
        |
        +----> Email
        |
        +----> Push notification
```

Notifications should be triggered from backend events rather than frontend assumptions.

---

# 54. Idempotency

This is important for order creation and payments.

Problem:

```text
Student clicks Place Order
        |
        +-- request 1
        +-- request 2
        +-- request 3
```

The system must create only one order.

Use an idempotency key.

Expected result:

```text
One user action
       |
       v
One order
```

The same principle applies to payment operations.

---

# 55. Multiple Orders

The system should support multiple simultaneous student orders.

Each order must have:

- Unique order ID
- Unique token
- Independent payment
- Independent status
- Independent document references
- Independent timestamps
- Independent status history

A student can have:

```text
XR-184 Processing
XR-179 Ready
XR-172 Completed
```

simultaneously.

---

# 56. Queue Data Design

Potential DynamoDB access pattern:

```text
PK = STATUS#PROCESSING
SK = createdAt
```

This allows staff to retrieve processing orders in queue order.

Another option is a GSI:

```text
GSI1PK = status
GSI1SK = createdAt
```

Use access-pattern-driven DynamoDB design.

Avoid full table scans for normal dashboard operations.

---

# 57. DynamoDB Indexes

Potential indexes:

## User Orders

```text
PK: userId
SK: createdAt
```

## Status Queue

```text
PK: status
SK: createdAt
```

## Token Search

```text
PK: token
```

## Payment Search

```text
PK: paymentStatus
SK: createdAt
```

Only create indexes that correspond to real application queries.

---

# 58. AWS Production Architecture

```text
                         Internet
                            |
                            v
                    Amazon Route 53
                            |
                            v
                Application Load Balancer
                       /           \
                      /             \
                     v               v
              Frontend ECS      Backend ECS
                 Service           Service
                                      |
                 +--------------------+----------------+
                 |                    |                |
                 v                    v                v
             Cognito             DynamoDB             S3
                 |                    |                |
                 |                    |                |
                 v                    v                v
              Identity             Orders          Documents

                 +--------------------------------------+
                 | Notifications / Email where required |
                 +--------------------------------------+

                 +--------------------------------------+
                 | CloudWatch                            |
                 | Logs + Metrics + Alarms              |
                 +--------------------------------------+
```

---

# 59. Docker Architecture

Two independent applications:

```text
Frontend
    |
    v
Docker Image
    |
    v
Amazon ECR
    |
    v
Amazon ECS
```

and:

```text
Backend
    |
    v
Docker Image
    |
    v
Amazon ECR
    |
    v
Amazon ECS
```

---

# 60. Frontend Docker Strategy

Use a multi-stage Docker build.

Conceptual process:

```text
Node Build Image
      |
      +-- npm ci
      |
      +-- npm run build
      |
      v
Production Runtime Image
      |
      v
Static frontend
```

The production image should contain only what is required to serve the built application.

---

# 61. Backend Docker Strategy

Conceptual process:

```text
Node Base Image
      |
      +-- npm ci
      |
      +-- TypeScript build
      |
      v
Production Runtime
      |
      v
Node.js API
```

Use:

```text
npm ci
npm run build
npm start
```

for the production workflow.

---

# 62. Local Docker Development

Create:

```text
docker-compose.yml
```

Services:

```text
frontend
backend
```

Run:

```bash
docker compose up
```

The full application should work locally in containers before moving to AWS.

---

# 63. Amazon ECR

Create repositories:

```text
xerox-frontend
xerox-backend
```

Deployment flow:

```text
Developer
    |
    v
Docker Build
    |
    v
Docker Image
    |
    v
Amazon ECR
    |
    v
Amazon ECS
```

Use image tags such as:

```text
latest
v1.0.0
git-<commit-sha>
```

For production, immutable commit-based tags are preferable.

---

# 64. Amazon ECS

Use:

**Amazon ECS with Fargate**

because it avoids direct server management.

Cluster:

```text
ECS Cluster
|
+-- frontend-service
|
+-- backend-service
```

Each service has:

- Task definition
- Container image
- CPU
- Memory
- Environment variables
- IAM task role
- Health check
- Scaling configuration

---

# 65. Application Load Balancer

Use an Application Load Balancer in front of the ECS services.

Example domain:

```text
https://xerox.college.edu
```

Routing:

```text
/       -> Frontend
/api/*  -> Backend
```

This creates a clean application architecture.

---

# 66. AWS Networking

Recommended production structure:

```text
VPC
|
+-- Public Subnets
|      |
|      +-- Application Load Balancer
|
+-- Private Subnets
       |
       +-- Backend ECS
       +-- Supporting resources
```

Use security groups to control traffic.

Do not expose the backend ECS service directly to the public internet if the architecture does not require it.

---

# 67. Route 53

Example:

```text
xerox.college.edu
```

Route 53:

```text
xerox.college.edu
        |
        v
Application Load Balancer
```

Use DNS records appropriate to the final domain setup.

---

# 68. HTTPS

Use:

**AWS Certificate Manager**

Architecture:

```text
Route 53
   |
   v
HTTPS
   |
   v
Application Load Balancer
```

Production user traffic should use HTTPS.

---

# 69. IAM

Use least-privilege IAM.

Backend ECS task role may require:

```text
S3:
    GetObject
    PutObject

DynamoDB:
    Read
    Write

Notification services:
    Send where required
```

Do not give the application:

```text
AdministratorAccess
```

unless there is an exceptional and justified infrastructure use case.

---

# 70. Secrets Management

Never commit:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
DATABASE_PASSWORD
JWT_SECRET
PAYMENT_SECRET
```

to Git.

Use:

**AWS Secrets Manager**

or secure ECS environment/secret injection mechanisms.

---

# 71. CloudWatch Monitoring

Monitor:

- API errors
- ECS CPU
- ECS memory
- Request latency
- Failed payments
- Upload failures
- Order creation failures
- Container health
- Task restarts

Create alarms for important production failures.

---

# 72. Logging

Backend logs should include useful operational events:

```text
INFO Order created
INFO Payment successful
INFO Order XR-184 processing

WARN Payment failed

ERROR S3 upload failed
ERROR DynamoDB operation failed
```

Never log:

- Passwords
- JWT tokens
- Secrets
- Payment credentials
- Unnecessary sensitive student data

---

# 73. Audit Logs

Track staff/admin actions.

Example:

```text
Staff: staff_102
Action: STATUS_CHANGED
Order: XR-184
From: PROCESSING
To: READY
Time: ...
```

Other audit actions:

```text
ORDER_REJECTED
ORDER_COMPLETED
PRICE_UPDATED
PRODUCT_UPDATED
STAFF_UPDATED
```

---

# 74. API Security

Backend should implement:

- JWT validation
- Role-based authorization
- Input validation
- Rate limiting
- CORS
- Request size limits
- File validation
- Secure headers
- Error handling

Useful libraries for Node.js include:

```text
Zod
Helmet
express-rate-limit
```

where appropriate.

---

# 75. File Security

Never trust the file extension alone.

Validate:

```text
MIME type
File signature
File size
Page count
```

Production can add:

```text
Malware scanning
```

before the file becomes available for staff processing.

---

# 76. Error Handling

Do not expose internal implementation errors to users.

Bad:

```text
DynamoDB ConditionalCheckFailedException
```

Good:

> Something went wrong while creating your order. Please try again.

Technical details should be logged internally.

---

# 77. Important Edge Cases

## Upload Failure

```text
Upload failed
[Retry]
```

## Payment Failure

```text
Payment failed
[Retry Payment]
```

## Duplicate Payment

Prevent multiple successful payment records for the same payment attempt/order.

## Staff Rejection

Store and display rejection reason.

## Invalid Status Update

Backend state machine rejects invalid transitions.

## Browser Refresh

Order state must persist in backend.

## Network Failure

Order creation should use idempotency.

## Multiple Clicks

Disable submission while request is being processed and enforce backend idempotency.

## File Deleted/Unavailable

Staff should receive a clear error and the system should retain an audit trail.

## Shop Closed

Prevent or clearly warn about new orders based on shop configuration.

## Product Out of Stock

Prevent stationery checkout for unavailable quantities.

---

# 78. UI/UX Design Principles

The interface should feel like a modern campus service platform rather than a generic admin template.

Avoid:

- Excessive cards
- Huge gradients
- Random glassmorphism
- Excessive rounded containers
- Repetitive dashboard cards
- Generic AI-generated visual patterns
- Excessive decorative elements

Prioritize:

- Clear hierarchy
- Fast task completion
- Strong typography
- Useful whitespace
- Consistent spacing
- Clear status indicators
- Mobile usability
- Staff efficiency

---

# 79. Student UI Pages

```text
Login
Register
Dashboard
New Order
Upload Document
Configure Printing
Order Summary
Payment
Order Success
Track Order
Order History
Notifications
Profile
```

---

# 80. Staff UI Pages

```text
Staff Dashboard
Orders
Order Details
Queue
Ready Orders
Completed Orders
Notifications
```

---

# 81. Admin UI Pages

```text
Admin Dashboard
Orders
Pricing
Products
Staff
Students
Reports
Notifications
Settings
```

---

# 82. Order Creation UX

Use a clear multi-step workflow:

```text
01 Upload
      |
      v
02 Requirements
      |
      v
03 Review
      |
      v
04 Payment
      |
      v
05 Confirmation
```

Progress indicator:

```text
•────•────•────•────•
Upload Requirements Review Payment Confirmation
```

Do not force users to fill a long form on one screen.

---

# 83. Order Success Screen

Make the token visually prominent.

```text
                âœ“

            ORDER PLACED

               XR-184

Your order has been received.

Estimated completion
15–20 minutes

[ Track Order ]

Please show token XR-184
when collecting your order.
```

---

# 84. Staff Queue UX

Staff needs actionable information immediately.

```text
XR-184
12 pages × 2
B&W · Double
PAID

[Start Processing]
```

Avoid making staff open multiple pages just to understand an order.

---

# 85. Accessibility

Support:

- Keyboard navigation
- Proper color contrast
- Screen-reader labels
- Visible focus states
- Large touch targets
- Clear error messages
- Accessible form controls
- Status labels that do not rely only on color

Example:

```text
âœ“ Ready
• Processing
! Rejected
```

instead of communicating state only through color.

---

# 86. Responsive Design

Student experience should be mobile-first.

Support:

```text
Mobile
Tablet
Desktop
```

Staff dashboard should prioritize:

```text
Desktop
Tablet
```

while remaining usable on mobile.

---

# 87. Testing Strategy

## Unit Tests

Test:

```text
Price calculation
Page-range parser
Token generation
Order state transitions
Input validation
Payment state transitions
```

Example:

```text
20 pages
2 copies
B&W
₹1/page

Expected = ₹40
```

---

# 88. Integration Tests

Test:

```text
Authentication
Document upload
Order creation
Price calculation
Payment
Order persistence
Staff status update
Notification creation
```

---

# 89. End-to-End Test

Primary demo scenario:

```text
Student Login
      |
      v
Upload PDF
      |
      v
Select B&W
      |
      v
Select Double-sided
      |
      v
2 Copies
      |
      v
Automatic Price
      |
      v
Demo Payment
      |
      v
Token XR-184
      |
      v
Staff receives order
      |
      v
Start Processing
      |
      v
Mark Ready
      |
      v
Student Notification
      |
      v
Completed
```

This should be the primary acceptance test for the project.

---

# 90. CI/CD

Recommended GitHub workflow:

```text
Developer Push
      |
      v
GitHub
      |
      v
GitHub Actions
      |
      +-- Run Tests
      |
      +-- Build Frontend
      |
      +-- Build Backend
      |
      +-- Build Docker Images
      |
      +-- Push Images to ECR
      |
      v
Deploy ECS
```

---

# 91. Git Branch Strategy

Recommended:

```text
main
develop
feature/*
fix/*
```

Example:

```text
feature/order-creation
feature/payment
feature/staff-dashboard
feature/aws-deployment
```

Use pull requests for meaningful changes.

---

# 92. Environment Separation

Maintain:

```text
Development
Staging
Production
```

Configuration should be environment-specific.

Example concepts:

```text
development
staging
production
```

Never commit production secrets.

---

# 93. Development Phases

# Phase 1 — Project Setup

Build:

```text
React frontend
Node backend
TypeScript
Git repository
Routing
Basic API
Basic UI
```

### Deliverable

Frontend and backend running locally.

---

# Phase 2 — Authentication

Implement:

```text
Login
Register
Logout
Roles
Protected routes
```

Initially use local/mock authentication if necessary.

Then migrate to Cognito.

### Deliverable

Student and staff can securely log in.

---

# Phase 3 — Document Upload

Implement:

```text
File picker
Drag and drop
File validation
Upload progress
Document preview
```

Initially:

```text
Local development storage
```

Production:

```text
Amazon S3
```

### Deliverable

Student can upload a document.

---

# Phase 4 — Printing Configuration

Implement:

```text
Copies
Page range
Color
Sides
Paper size
Service type
```

### Deliverable

Student can completely configure a print/Xerox request.

---

# Phase 5 — Pricing Engine

Implement:

```text
calculatePrice()
```

Create configurable pricing rules.

### Deliverable

Correct price is calculated automatically by the backend.

---

# Phase 6 — Order Management

Implement:

```text
Create order
Generate token
Save order
View order
Track order
```

### Deliverable

Complete basic order creation and tracking.

---

# Phase 7 — Staff Dashboard

Implement:

```text
Incoming orders
Order details
Document access
Status changes
Reject order
```

### Deliverable

Staff can process orders from a centralized dashboard.

---

# Phase 8 — Payment

Implement:

```text
Demo payment
Payment status
Transaction ID
Payment verification
```

### Deliverable

Student can simulate payment before collection.

---

# Phase 9 — Queue + ETA

Implement:

```text
Queue
Priority
Average processing time
Estimated completion
```

### Deliverable

Student sees approximate collection time.

---

# Phase 10 — Notifications

Implement:

```text
Order received
Processing
Ready
Rejected
Completed
```

Start with:

```text
In-app notifications
```

Then add email.

---

# Phase 11 — Stationery

Implement:

```text
Product catalog
Product quantity
Stock
Cart
Stationery pricing
```

Allow:

```text
Print + Stationery
```

as a single order.

---

# Phase 12 — Admin

Implement:

```text
Pricing management
Product management
Staff management
Shop settings
Reports
```

---

# Phase 13 — AWS Migration

Move:

```text
Documents -> S3
Database -> DynamoDB
Authentication -> Cognito
```

---

# Phase 14 — Docker

Create:

```text
frontend/Dockerfile
backend/Dockerfile
docker-compose.yml
```

Verify:

```bash
docker compose up
```

---

# Phase 15 — ECR

Create:

```text
xerox-frontend
xerox-backend
```

Build and push Docker images.

---

# Phase 16 — ECS

Create:

```text
ECS Cluster
Frontend Service
Backend Service
Task Definitions
Load Balancer
```

Configure:

```text
CPU
Memory
Environment variables
IAM roles
Health checks
```

---

# Phase 17 — Networking + Domain

Configure:

```text
VPC
Subnets
Security Groups
Application Load Balancer
Route 53
ACM
HTTPS
```

Final target:

```text
https://xerox.college.edu
```

---

# Phase 18 — Monitoring

Configure:

```text
CloudWatch Logs
Metrics
Alarms
Health checks
Error monitoring
```

---

# Phase 19 — Security Review

Verify:

```text
âœ“ HTTPS
âœ“ Cognito
âœ“ JWT validation
âœ“ IAM least privilege
âœ“ S3 private
âœ“ Pre-signed URLs
âœ“ Input validation
âœ“ File validation
âœ“ Rate limiting
âœ“ CORS
âœ“ Secrets Manager
âœ“ DynamoDB permissions
âœ“ Audit logging
```

---

# 94. Recommended Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript |
| Build | Vite |
| UI | Tailwind CSS / component system |
| Backend | Node.js + TypeScript |
| API | Express.js |
| Validation | Zod |
| Authentication | Amazon Cognito |
| Database | Amazon DynamoDB |
| File Storage | Amazon S3 |
| Containers | Docker |
| Container Registry | Amazon ECR |
| Compute | Amazon ECS Fargate |
| Load Balancing | Application Load Balancer |
| DNS | Amazon Route 53 |
| HTTPS | AWS Certificate Manager |
| Secrets | AWS Secrets Manager |
| Monitoring | Amazon CloudWatch |
| Networking | Amazon VPC |
| Permissions | AWS IAM |
| Notifications | Amazon SES/SNS where appropriate |
| CI/CD | GitHub Actions |

---

# 95. MVP vs Advanced vs Production

| Feature | Foundation | Advanced | Production |
|---|:---:|:---:|:---:|
| Login | âœ“ | âœ“ | Cognito |
| Document upload | âœ“ | âœ“ | S3 |
| Print configuration | âœ“ | âœ“ | âœ“ |
| Price calculation | âœ“ | âœ“ | âœ“ |
| Order token | âœ“ | âœ“ | âœ“ |
| Order tracking | âœ“ | âœ“ | âœ“ |
| Staff dashboard | âœ“ | âœ“ | âœ“ |
| Status workflow | âœ“ | âœ“ | âœ“ |
| Simulated payment |  | âœ“ | âœ“ |
| Payment tracking |  | âœ“ | âœ“ |
| Notifications |  | âœ“ | âœ“ |
| Queue management |  | âœ“ | âœ“ |
| ETA |  | âœ“ | âœ“ |
| Order history |  | âœ“ | âœ“ |
| Rejection |  | âœ“ | âœ“ |
| Stationery |  | âœ“ | âœ“ |
| Admin panel |  | âœ“ | âœ“ |
| S3 |  |  | âœ“ |
| DynamoDB |  |  | âœ“ |
| Cognito |  |  | âœ“ |
| Docker |  |  | âœ“ |
| ECR |  |  | âœ“ |
| ECS |  |  | âœ“ |
| Route 53 |  |  | âœ“ |
| HTTPS |  |  | âœ“ |
| CloudWatch |  |  | âœ“ |
| CI/CD |  |  | âœ“ |

---

# 96. Hackathon Priority

If implementation time is limited, do not build every feature before validating the core workflow.

## P0 — Must Work

```text
Authentication
    |
    v
Upload document
    |
    v
Print requirements
    |
    v
Price calculation
    |
    v
Order creation
    |
    v
Token generation
    |
    v
Student tracking
    |
    v
Staff dashboard
```

## P1 — Core Enhancement

```text
Payment
Notifications
Queue
ETA
Rejection
Order history
```

## P2 — Business Features

```text
Stationery
Admin
Pricing management
Inventory
Analytics
```

## P3 — Production

```text
Cognito
S3
DynamoDB
Docker
ECR
ECS
ALB
VPC
Route 53
HTTPS
IAM
Secrets Manager
CloudWatch
CI/CD
```

---

# 97. Features That Impress Judges

## 1. Live Queue

```text
You are #3 in queue
```

## 2. ETA

```text
Ready in approximately 12 minutes
```

## 3. Digital Token

```text
XR-184
```

## 4. Real-Time Status

```text
Received -> Processing -> Ready
```

## 5. Document Security

Private S3 storage with temporary authorized URLs.

## 6. Staff Efficiency

One centralized dashboard instead of email/WhatsApp-based order handling.

## 7. Analytics

Example:

```text
Today's orders: 127
Completed: 110
Processing: 9
Rejected: 8

Revenue: ₹4,820

Most requested:
B&W printing
```

## 8. Stationery Integration

Example:

```text
Print assignment
+
2 pens
+
1 record book
```

as one order.

---

# 98. Final Project Structure

```text
digital-xerox-system/
|
+-- frontend/
|   +-- src/
|   +-- public/
|   +-- Dockerfile
|   +-- package.json
|   +-- README.md
|
+-- backend/
|   +-- src/
|   |   +-- controllers/
|   |   +-- services/
|   |   +-- routes/
|   |   +-- middleware/
|   |   +-- validators/
|   |   +-- utils/
|   +-- Dockerfile
|   +-- package.json
|   +-- README.md
|
+-- infrastructure/
|   +-- ecs/
|   +-- ecr/
|   +-- iam/
|   +-- s3/
|   +-- dynamodb/
|   +-- cognito/
|   +-- networking/
|   +-- route53/
|
+-- .github/
|   +-- workflows/
|       +-- frontend.yml
|       +-- backend.yml
|
+-- docker-compose.yml
+-- README.md
+-- architecture.md
```

---

# 99. Suggested Implementation Order

Use this exact order:

```text
1. Project setup
2. UI shell
3. Authentication
4. Student dashboard
5. Document upload
6. Print configuration
7. Pricing engine
8. Order creation
9. Token generation
10. Student tracking
11. Staff dashboard
12. Status workflow
13. Demo payment
14. Queue management
15. ETA
16. Notifications
17. Order history
18. Rejection workflow
19. Stationery
20. Admin dashboard
21. DynamoDB migration
22. S3 migration
23. Cognito
24. Docker
25. ECR
26. ECS
27. ALB
28. VPC
29. Route 53
30. HTTPS
31. Secrets Manager
32. CloudWatch
33. CI/CD
34. Security testing
35. Production testing
```

---

# 100. Final Production Architecture

```text
                         STUDENT
                            |
                            v
                    +---------------+
                    |   Route 53    |
                    +-------+-------+
                            |
                          HTTPS
                            |
                            v
                +------------------------+
                | Application Load       |
                | Balancer               |
                +-----------+------------+
                            |
             +--------------+--------------+
             |                             |
             v                             v
     +---------------+             +---------------+
     | Frontend ECS  |             | Backend ECS   |
     | React         |             | Node.js       |
     +---------------+             +-------+-------+
                                            |
                    +-----------------------+----------------------+
                    |              |              |                |
                    v              v              v                v
              +---------+    +---------+    +---------+    +-------------+
              | Cognito |    | DynamoDB |    | S3      |    | Notifications|
              +---------+    +---------+    +---------+    +-------------+
                                  |              |
                                  v              v
                               Orders       Documents

                    +-----------------------------------+
                    | CloudWatch                        |
                    | Logs + Metrics + Alarms          |
                    +-----------------------------------+
```

---

# 101. Core Value Proposition

The finished platform should make the physical Xerox shop function like a digital order fulfillment center.

```text
Student submits remotely
        |
        v
System validates and prices
        |
        v
Payment confirmed
        |
        v
Token generated
        |
        v
Staff processes centralized queue
        |
        v
Student receives "Ready" notification
        |
        v
Student visits shop
        |
        v
Collection
```

### Problem solved

Instead of:

```text
Student
   |
   v
Walk to Xerox shop
   |
   v
Wait in queue
   |
   v
Send file / copy document
   |
   v
Wait
   |
   v
Pay
   |
   v
Wait again
```

the system provides:

```text
Student
   |
   v
Digital order
   |
   v
Digital requirements
   |
   v
Digital price
   |
   v
Digital payment
   |
   v
Digital token
   |
   v
Digital tracking
   |
   v
Visit only for collection
```

---

# 102. Final Acceptance Criteria

The project can be considered functionally complete when the following scenario works from beginning to end:

```text
1. Student logs in
2. Student creates a new order
3. Student uploads a valid PDF
4. System detects document information
5. Student selects page range
6. Student selects number of copies
7. Student selects B&W or Color
8. Student selects Single/Double-sided
9. System calculates the price
10. Student reviews order
11. Student completes demo/real payment
12. System creates one unique order
13. System generates a unique token
14. Student sees order tracking
15. Staff sees order in dashboard
16. Staff opens the submitted document
17. Staff verifies payment
18. Staff changes status to Processing
19. Student sees Processing
20. Staff changes status to Ready
21. Student receives Ready notification
22. Student visits the shop
23. Staff verifies token
24. Staff completes the order
25. Student sees Completed
26. Order appears in history
27. All important actions are logged
```

For production readiness, additionally verify:

```text
28. Documents are stored privately in S3
29. Database data is stored in DynamoDB
30. Authentication uses Cognito
31. Frontend is containerized
32. Backend is containerized
33. Images are stored in ECR
34. Containers run on ECS
35. Traffic is routed through ALB
36. Domain is managed by Route 53
37. HTTPS is enabled
38. Secrets are not stored in Git
39. IAM permissions are least-privilege
40. CloudWatch monitoring is enabled
41. CI/CD deploys tested builds
42. Security and failure scenarios are tested
```

---

# 103. Recommended Final Demo

The strongest demonstration should focus on one realistic student order.

### Student side

```text
Login
  â†“
Upload "Assignment.pdf"
  â†“
20 pages
  â†“
2 copies
  â†“
A4
  â†“
B&W
  â†“
Double-sided
  â†“
Price: ₹40
  â†“
Demo Payment
  â†“
Token: XR-184
```

### Staff side

```text
New Order: XR-184
  â†“
Open document
  â†“
Verify requirements
  â†“
Payment: PAID
  â†“
Start Processing
  â†“
Mark Ready
```

### Student side

```text
Notification:
"XR-184 is ready for collection."
```

Then:

```text
Student arrives
  â†“
Shows XR-184
  â†“
Collection
  â†“
Completed
```

This directly demonstrates the central problem being solved: **reducing physical waiting while giving the Xerox shop a centralized, trackable workflow.**

---

# 104. Project Outcome

The final Digital Xerox & Stationery Ordering System should provide:

- Faster student service
- Reduced physical queues
- Digital document submission
- Transparent pricing
- Digital/simulated payments
- Unique order tokens
- Real-time or near-real-time tracking
- Centralized staff processing
- Queue visibility
- Estimated completion times
- Notifications
- Order history
- Stationery ordering
- Inventory support
- Secure document storage
- Role-based access
- Auditability
- Cloud-native deployment
- Containerized applications
- AWS scalability
- Production monitoring

The architecture is intentionally layered so the same project can start as a **simple college/hackathon MVP** and progressively become a **production-ready AWS application** without rewriting the entire system.


