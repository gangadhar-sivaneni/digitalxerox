# 🖨️ Printly — Digital Document Printing Management System

**Printly** is a digital document printing management system designed to simplify and digitize the complete printing workflow. It enables users to upload documents, configure printing requirements, place print requests, make payments, and track their orders through a centralized platform.

The system provides dedicated interfaces for **Users, Staff, and Administrators**, allowing each role to perform specific tasks. Staff can efficiently process incoming print requests and access uploaded files, while administrators can manage available printing products/services and their pricing.

---

## 🚀 Key Features

### 👤 User

* User authentication and role-based access
* Upload documents for printing
* Support for PDF and image files
* Select printing requirements
* Place printing requests
* View and track order status
* Online card payment
* Cash-at-counter payment

### 👨‍💼 Staff

* View incoming printing requests
* Access uploaded documents and images
* Preview submitted files
* Process and manage print requests
* Update order status
* Save uploaded image files locally when required

### 🔐 Administrator

* Manage printing products/services
* Add new printing products
* Edit existing products
* Remove products
* Add or update product prices
* Manage the available printing options dynamically

---

## 🔄 System Workflow

```text
User
  │
  ▼
Upload Document
  │
  ▼
Select Printing Requirements
  │
  ▼
Place Print Request
  │
  ▼
Choose Payment Method
  │
  ├──► Card Payment
  │
  └──► Cash at Counter
  │
  ▼
Staff Receives Request
  │
  ▼
Staff Processes Order
  │
  ▼
Order Status Updated
  │
  ▼
User Tracks Order
```

---

## 🛠️ Tech Stack

| Category                   | Technologies                                                     |
| -------------------------- | ---------------------------------------------------------------- |
| **Frontend**               | HTML5, CSS3, JavaScript                                          |
| **Backend**                | Node.js, Express.js                                              |
| **Database**               | PostgreSQL                                                       |
| **Cloud Platform**         | Amazon Web Services (AWS)                                        |
| **Container Registry**     | Amazon Elastic Container Registry (Amazon ECR)                   |
| **Application Deployment** | Amazon Elastic Container Service (Amazon ECS)                    |
| **File Storage**           | Amazon Simple Storage Service (Amazon S3)                        |
| **Payment Gateway**        | Razorpay                                                         |
| **Version Control**        | Git, GitHub                                                      |
| **Domain Provider**        | .tech                                                            |
| **Domain**                 | `gangadharsivaneni.tech`                                         |
| **Design**                 | Claude                                                           |
| **AI Tools / Models**      | GPT-5.6, Kiro, BigPickle, Claude 5.1, Gemini, DeepSeek, Nemotron |

---

## ☁️ Deployment Architecture

The application is deployed using **AWS cloud infrastructure**.

```text
                    ┌──────────────┐
                    │    Users     │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Frontend   │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Node.js /    │
                    │ Express.js   │
                    └──────┬───────┘
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
       ┌──────────┐  ┌──────────┐  ┌────────────┐
       │PostgreSQL│  │   AWS S3 │  │  Razorpay  │
       │ Database │  │  Storage │  │  Payments  │
       └──────────┘  └──────────┘  └────────────┘
                           ▲
                           │
                    ┌──────┴───────┐
                    │   AWS ECS    │
                    │  + Docker    │
                    └──────┬───────┘
                           ▲
                           │
                    ┌──────┴───────┐
                    │   AWS ECR    │
                    │ Docker Images│
                    └──────────────┘
```

---

# 🧪 Testing Instructions

## 1. User Login

* Use the **email addresses provided in the application specifically for testing**.
* Select the appropriate user type and use its corresponding test email address.

## 2. PDF Upload

* Upload only **non-encrypted PDF files**.
* **Encrypted/password-protected PDFs should not be uploaded.**

## 3. Online Payment

In the **Online Payment** tab, you can choose:

* **Card Payment**
* **Cash at Counter**

### Test Card Details

Use the following credentials for testing the card payment flow:

```text
Card Number: 4100 2800 0000 1007
Expiry Date: Any future date
CVV: Any number
```

> ⚠️ These credentials are intended **only for testing purposes**.

## 4. Staff Tab

* **•** The **file preview loading time depends on the size of the uploaded document**. Larger documents may take slightly longer to preview.
* **•** For **image file types only**, images can be saved locally using **Right Click → Save image as...**. This functionality applies only to image files.

---

# 📁 Supported File Handling

The system supports document and image-based printing workflows.

### PDF Files

* Upload non-encrypted PDFs.
* Password-protected/encrypted PDFs should not be uploaded.
* Preview loading time may vary depending on document size.

### Image Files

* Images can be previewed through the Staff interface.
* Staff can save images locally using the browser's **Save image as...** option.

---

# 👥 User Roles

| Role      | Main Responsibilities                                                                |
| --------- | ------------------------------------------------------------------------------------ |
| **User**  | Upload documents, configure printing, place orders, make payments and track requests |
| **Staff** | View, process and update printing requests                                           |
| **Admin** | Manage printing products/services and their prices                                   |

---

# 💳 Payment Options

Printly provides two payment methods:

### Online Card Payment

Users can complete payment through the integrated Razorpay payment gateway.

### Cash at Counter

Users can choose to pay at the counter instead of making an online payment.

---

# 🔐 Security & Access

The application uses **role-based access** to provide different functionality to Users, Staff, and Administrators. Document files are handled through the application's storage workflow, with uploaded files stored using cloud-based storage infrastructure.

---

# 🌐 Deployment

**Domain:** `gangadharsivaneni.tech`

The application is deployed using AWS services including:

* Amazon ECS
* Amazon ECR
* Amazon S3
* PostgreSQL
* Docker

---

# 🤖 AI-Assisted Development

AI tools and models were used during different stages of development, design, debugging, ideation, and implementation.

### Tools / Models Used

* GPT-5.6
* Kiro
* BigPickle
* Claude 5.1
* Gemini
* DeepSeek
* Nemotron

**UI/UX and design:** Claude

---

# 📌 Important Notes

* Use only the **provided testing email addresses** when evaluating the application.
* Do not upload encrypted or password-protected PDF files.
* Large documents may require additional time to generate a preview.
* Image saving through **Save image as...** is intended for image file types only.
* The provided card details are for testing the payment flow only.

---

# 👨‍💻 Project

**Project:** Printly — Digital Document Printing Management System
**Domain:** `gangadharsivaneni.tech`

Built to provide a faster, centralized, and more efficient approach to digital printing management.
