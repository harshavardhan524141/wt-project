# QUEUELESS SMART MANAGEMENT SYSTEM

A streamlined, secure digital queue token dispensing and queue dispatcher platform built for educational institutions and banking branches.

---

## 🏛️ Two Distinct Portals

### 1. Customer Portal (Public / Student & Customer Access)
A simple 3-step token generation process:
1. **Choose Genre**:
   - **Schooling / College**: GVP (Gayatri Vidya Parishad), GITAM Deemed University, Andhra University (AU), Raghu Engineering College (REC).
   - **Bank**: State Bank of India (SBI), HDFC Bank, Union Bank of India (UBI).
2. **Choose Available Location**: Select a specific campus or bank branch in the city.
3. **Choose Available Use / Purpose**:
   - In Colleges: *Fee Payment & Tuition Accounts*, *Receiving Certificates & Transcripts*, *Student ID Card & Bonafide Issuance*, *Hostel & Transport Pass Desk*.
   - In Banks: *Cash Deposit & Withdrawal*, *Account Opening & KYC Verification*, *Education & Personal Loan Desk*, *Passbook & Cheque Book Service*.
4. **Customer Details & Identity Verification**:
   - Collects customer full name, mobile number, and Gmail address.
   - 1-click **Mobile OTP** or **Gmail verification** (test code `123456` provided for instant verification).
   - Enter optional roll number / challan details.
5. **Receive Instant Token**:
   - Generates sequential token (e.g. `GVP-FEE-104`, `GIT-CRT-102`, `SBI-CSH-103`).
   - Live position tracking (`#1 in line`), wait time countdown, and audible chime when called.

### 2. Admin Portal (Staff & Operator Console)
- **High Security Access**: Dedicated staff operator login protected with password:
  - **Email**: `admin@queueless.com`
  - **Password**: `admin@123`
- **Station / Desk Assignment**: Select active station (e.g. *Counter 1 (Accounts)*, *Autonomous Cell Desk 3*, *Cashier Desk*).
- **Call Next Customer**: Instantly pulls the next waiting token to the counter, plays an audible audio chime, and updates the customer's screen with instructions to proceed to the counter.
- **Mark as Served / Skip**: Mark completed tokens or skip unattended customers with reason logging.
- **Recall / Announce**: Re-broadcast the arrival announcement.

---

## 🔑 Login Credentials

| Portal | Email | Password | Role |
|---|---|---|---|
| **Admin Portal** | `admin@queueless.com` | **`admin@123`** | Staff / Operator Console |
| **Customer Portal** | `harsha.student@gmail.com` | `user123` | Student / Customer |
| **Customer Portal** | `pooja.sharma@gmail.com` | `user123` | Student / Customer |

*Both portals include fast 1-click test credential fill buttons.*

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Web Audio API chime
- **Backend**: Node.js, Express, TypeScript (`tsx`)
- **Database**: Persistent SQLite (`better-sqlite3`) with WAL mode & atomic transactions
- **Authentication**: JWT & `bcryptjs`
