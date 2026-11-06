import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// Ensure data folder exists
const dbDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'queueless.db');
export const db = new Database(dbPath);

// Enable WAL mode for better concurrency and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(forceReseed = false) {
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      is_phone_verified INTEGER DEFAULT 0,
      is_email_verified INTEGER DEFAULT 0,
      role TEXT NOT NULL DEFAULT 'user', -- 'user' | 'admin'
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_centers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL, -- 'Schooling / College' | 'Bank' | 'Government / Civic'
      address TEXT NOT NULL,
      phone TEXT,
      operating_hours TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      center_id INTEGER NOT NULL REFERENCES service_centers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      prefix TEXT NOT NULL, -- e.g. 'FEE', 'CERT', 'CSH'
      description TEXT,
      avg_service_time_mins INTEGER NOT NULL DEFAULT 8,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS queue_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      center_id INTEGER NOT NULL REFERENCES service_centers(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      customer_name TEXT,
      customer_phone TEXT,
      customer_email TEXT,
      token_number TEXT NOT NULL,
      sequence_number INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting' | 'now_serving' | 'served' | 'skipped' | 'cancelled'
      counter_desk TEXT,
      notes TEXT,
      verification_method TEXT DEFAULT 'Mobile / Email Verified',
      joined_at TEXT NOT NULL,
      called_at TEXT,
      completed_at TEXT,
      estimated_wait_mins INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS queue_history_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_id INTEGER NOT NULL REFERENCES queue_tokens(id) ON DELETE CASCADE,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      changed_by INTEGER REFERENCES users(id),
      note TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Check if admin password needs reset or reseed
  const adminUser = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@queueless.com') as any;
  const isCorrectPass = adminUser && bcrypt.compareSync('admin@123', adminUser.password_hash);
  const collegeCheck = db.prepare('SELECT id FROM service_centers WHERE code = ?').get('GVP');

  if (!adminUser || !isCorrectPass || !collegeCheck || forceReseed) {
    seedData();
  }
}

function seedData() {
  const now = new Date().toISOString();
  const salt = bcrypt.genSaltSync(10);
  // Requested admin password: "admin@123"
  const adminHash = bcrypt.hashSync('admin@123', salt);
  const userHash = bcrypt.hashSync('user123', salt);

  // Clear existing seed to guarantee clean new college & bank data
  db.exec(`
    DELETE FROM queue_history_logs;
    DELETE FROM queue_tokens;
    DELETE FROM services;
    DELETE FROM service_centers;
    DELETE FROM users;
  `);

  // Insert Users
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, phone, is_phone_verified, is_email_verified, role, created_at)
    VALUES (?, ?, ?, ?, 1, 1, ?, ?)
  `);

  const adminResult = insertUser.run('Campus / Branch Super Admin', 'admin@queueless.com', adminHash, '+91 98765 43210', 'admin', now);
  const user1Result = insertUser.run('Harsha Patnaik', 'harsha.student@gmail.com', userHash, '+91 98480 12345', 'user', now);
  const user2Result = insertUser.run('Pooja Sharma', 'pooja.sharma@gmail.com', userHash, '+91 94401 56789', 'user', now);
  const user3Result = insertUser.run('Kiran Varma', 'kiran.varma@gmail.com', userHash, '+91 98660 99887', 'user', now);

  const adminId = Number(adminResult.lastInsertRowid);
  const user1Id = Number(user1Result.lastInsertRowid);
  const user2Id = Number(user2Result.lastInsertRowid);
  const user3Id = Number(user3Result.lastInsertRowid);

  // Insert Service Centers (Colleges, Banks, Civic)
  const insertCenter = db.prepare(`
    INSERT INTO service_centers (name, code, category, address, phone, operating_hours, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  // 1. Schooling / College Locations
  const gvp = insertCenter.run(
    'GVP College of Engineering (Autonomous)',
    'GVP',
    'Schooling / College',
    'Madhurawada Campus, Visakhapatnam, AP 530048',
    '+91 891 2739507',
    'Mon - Sat: 9:00 AM - 4:30 PM',
    now,
    now
  ).lastInsertRowid as number;

  const gitam = insertCenter.run(
    'GITAM Deemed to be University',
    'GITAM',
    'Schooling / College',
    'Gandhi Nagar, Rushikonda, Visakhapatnam, AP 530045',
    '+91 891 2840501',
    'Mon - Sat: 9:00 AM - 5:00 PM',
    now,
    now
  ).lastInsertRowid as number;

  const au = insertCenter.run(
    'Andhra University College of Engineering',
    'AU',
    'Schooling / College',
    'Waltair Uplands, Visakhapatnam, AP 530003',
    '+91 891 2844000',
    'Mon - Fri: 10:00 AM - 5:00 PM',
    now,
    now
  ).lastInsertRowid as number;

  const raghu = insertCenter.run(
    'Raghu Engineering College',
    'REC',
    'Schooling / College',
    'Dakamarri, Bheemunipatnam Mandal, Visakhapatnam, AP 531162',
    '+91 8922 248001',
    'Mon - Sat: 8:45 AM - 4:15 PM',
    now,
    now
  ).lastInsertRowid as number;

  // 2. Bank Locations
  const sbi = insertCenter.run(
    'State Bank of India (Main City Branch)',
    'SBI',
    'Bank',
    'Siripuram Main Junction, Visakhapatnam, AP 530003',
    '+91 891 2564221',
    'Mon - Sat (except 2nd/4th Sat): 10:00 AM - 4:00 PM',
    now,
    now
  ).lastInsertRowid as number;

  const hdfc = insertCenter.run(
    'HDFC Bank (Commercial Hub)',
    'HDFC',
    'Bank',
    'Double Road, MVP Colony Sector 4, Visakhapatnam, AP 530017',
    '+91 891 6678200',
    'Mon - Sat: 9:30 AM - 4:30 PM',
    now,
    now
  ).lastInsertRowid as number;

  const ubi = insertCenter.run(
    'Union Bank of India (Campus Branch)',
    'UBI',
    'Banking',
    'Near Academic Complex, University North Gate, Visakhapatnam',
    '+91 891 2754320',
    'Mon - Fri: 10:00 AM - 3:30 PM',
    now,
    now
  ).lastInsertRowid as number;

  // 3. Medical Clinic / Hospital Locations
  const apollo = insertCenter.run(
    'Apollo Health City Clinic & Hospital',
    'APOLLO',
    'Medical Clinic / Hospital',
    'Health City, Arilova, Visakhapatnam, AP 530040',
    '+91 891 2867777',
    'Open 24/7 (OP Consultation: 8:00 AM - 8:00 PM)',
    now,
    now
  ).lastInsertRowid as number;

  const care = insertCenter.run(
    'Care Hospitals Multi-Specialty Clinic',
    'CARE',
    'Medical Clinic / Hospital',
    'AS Raja Complex, Waltair Main Road, Visakhapatnam, AP 530002',
    '+91 891 3041444',
    'Mon - Sat: 8:30 AM - 7:30 PM',
    now,
    now
  ).lastInsertRowid as number;

  const kims = insertCenter.run(
    'KIMS Medical Diagnostic Center',
    'KIMS',
    'Medical Clinic / Hospital',
    'Sheela Nagar, Industrial Estate, Visakhapatnam, AP 530012',
    '+91 891 3500500',
    'Mon - Sat: 7:30 AM - 6:30 PM',
    now,
    now
  ).lastInsertRowid as number;

  // Insert Services / Uses under each location
  const insertService = db.prepare(`
    INSERT INTO services (center_id, name, prefix, description, avg_service_time_mins, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `);

  // GVP College Services
  const gvpFee = insertService.run(gvp, 'Fee Payment & Tuition Accounts', 'GVP-FEE', 'Semester tuition fee payment, bus fee challans, exam fee clearance, and receipt collection.', 7, now, now).lastInsertRowid as number;
  const gvpCert = insertService.run(gvp, 'Receiving Certificates & Transcripts', 'GVP-CRT', 'Collection of Original Degree, Provisional, Consolidated Marks Memo (CMM), and Migration certificates.', 10, now, now).lastInsertRowid as number;
  const gvpId = insertService.run(gvp, 'Student ID Card & Bonafide Issuance', 'GVP-ID', 'New ID card generation, replacement of damaged smart cards, and study/bonafide certificates for passport/visas.', 5, now, now).lastInsertRowid as number;
  const gvpHostel = insertService.run(gvp, 'Hostel & Transport Pass Desk', 'GVP-PAS', 'Hostel room allotment, mess card renewals, and semester bus route passes.', 6, now, now).lastInsertRowid as number;

  // GITAM University Services
  const gitamFee = insertService.run(gitam, 'Fee Payment & Scholarship Cell', 'GIT-FEE', 'Annual academic fee collection, national/merit scholarship clearance, and finance verification.', 8, now, now).lastInsertRowid as number;
  const gitamCert = insertService.run(gitam, 'Receiving Certificates & Examination Cell', 'GIT-CRT', 'Degree distribution, back-log grade cards, autonomous grade verification, and WES transcript attestations.', 12, now, now).lastInsertRowid as number;
  const gitamId = insertService.run(gitam, 'Student Affairs & Bonafide Clearance', 'GIT-ADM', 'Bonafide letters, no-objection certificates (NOC), and international student documentation.', 6, now, now).lastInsertRowid as number;

  // AU College Services
  const auCert = insertService.run(au, 'Examination Cell & Transcripts', 'AU-CRT', 'Convocation degree certificates, duplicate marks sheet issuance, and official transcripts.', 10, now, now).lastInsertRowid as number;
  const auFee = insertService.run(au, 'Cashier & Special Fee Counter', 'AU-FEE', 'University exam fee, autonomous lab fee challans, and revaluation fee payment.', 6, now, now).lastInsertRowid as number;

  // REC College Services
  const recFee = insertService.run(raghu, 'Fee Counter & Accounts Section', 'REC-FEE', 'Tuition installments, JNTU affiliation fees, and transport fee clearance.', 7, now, now).lastInsertRowid as number;
  const recCert = insertService.run(raghu, 'Certificate & TC Dispatch Desk', 'REC-CRT', 'Custody certificate, Transfer Certificate (TC), study certificates, and grade sheets.', 9, now, now).lastInsertRowid as number;

  // SBI Bank Services
  const sbiCash = insertService.run(sbi, 'Cash Deposit & Withdrawal', 'SBI-CSH', 'High volume cash deposits, token counter withdrawals, and certified manager checks.', 5, now, now).lastInsertRowid as number;
  const sbiKyc = insertService.run(sbi, 'Account Opening & KYC Verification', 'SBI-KYC', 'New savings/current accounts, Aadhaar/PAN re-KYC linking, and mobile number updates.', 12, now, now).lastInsertRowid as number;
  const sbiLoan = insertService.run(sbi, 'Education & Personal Loan Desk', 'SBI-EDL', 'Student education loan documentation, Vidya Lakshmi portal clearance, and personal loans.', 20, now, now).lastInsertRowid as number;
  const sbiPass = insertService.run(sbi, 'Passbook & Cheque Book Service', 'SBI-PB', 'Passbook barcode printing, personalized cheque book requests, and ATM card delivery.', 4, now, now).lastInsertRowid as number;

  // HDFC Bank Services
  const hdfcCash = insertService.run(hdfc, 'Teller & Cash Transactions', 'HDFC-CSH', 'Cash counter deposits, NEFT/RTGS counter remittances, and traveler drafts.', 5, now, now).lastInsertRowid as number;
  const hdfcKyc = insertService.run(hdfc, 'Account & NRI Services Desk', 'HDFC-ACC', 'Preferred banking accounts, corporate salary setups, and KYC renewal.', 10, now, now).lastInsertRowid as number;

  // UBI Bank Services
  const ubiCash = insertService.run(ubi, 'Student Accounts & Fee Challans', 'UBI-ACC', 'College fee payment challans, zero-balance student accounts, and stipend credits.', 6, now, now).lastInsertRowid as number;
  const ubiKyc = insertService.run(ubi, 'Cash Counter & Passbook Desk', 'UBI-CSH', 'Routine cash deposit, withdrawal, and passbook kiosk assistance.', 5, now, now).lastInsertRowid as number;

  // Apollo Hospital / Medical Clinic Services
  const apolloDoc = insertService.run(apollo, 'Meet Doctor / OP Consultation', 'APO-DOC', 'Outpatient general medicine & specialist doctor consultation slip queue.', 12, now, now).lastInsertRowid as number;
  const apolloLab = insertService.run(apollo, 'Diagnostic Blood & Sample Collection', 'APO-LAB', 'Pathology diagnostics, fasting blood sugar, CBC panels, and sample submission.', 6, now, now).lastInsertRowid as number;
  const apolloPharm = insertService.run(apollo, 'Pharmacy Dispensing & Medicine Billing', 'APO-PHR', 'Prescription medicine dispensing, insurance cashless clearance, and billing.', 5, now, now).lastInsertRowid as number;

  // Care Hospital Services
  const careDoc = insertService.run(care, 'Specialist Doctor Consultation', 'CARE-DOC', 'Cardiology, Orthopedic, and Internal Medicine consultation appointment token.', 15, now, now).lastInsertRowid as number;
  const careLab = insertService.run(care, 'Clinical Diagnostics & Sample Counter', 'CARE-LAB', 'Phlebotomy, routine blood panels, ECG, and diagnostic investigations.', 7, now, now).lastInsertRowid as number;

  // KIMS Diagnostic Services
  const kimsDoc = insertService.run(kims, 'General Physician & Health Checkup', 'KIMS-DOC', 'Routine physician health checkup, vitals screening, and consultation.', 10, now, now).lastInsertRowid as number;
  const kimsPharm = insertService.run(kims, 'Medical Pharmacy & Cashier', 'KIMS-PHR', 'Pharmacy counter medication collection and billing receipts.', 4, now, now).lastInsertRowid as number;

  // Initial demonstration tokens
  const insertToken = db.prepare(`
    INSERT INTO queue_tokens (service_id, center_id, user_id, customer_name, customer_phone, customer_email, token_number, sequence_number, status, counter_desk, notes, verification_method, joined_at, called_at, completed_at, estimated_wait_mins)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLog = db.prepare(`
    INSERT INTO queue_history_logs (token_id, previous_status, new_status, changed_by, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // GVP Fee Queue:
  // Token 101 - Served
  const t1 = insertToken.run(gvpFee, gvp, user2Id, 'Pooja Sharma', '+91 94401 56789', 'pooja.sharma@gmail.com', 'GVP-FEE-101', 101, 'served', 'Counter 1 (Accounts)', 'Semester 5 Tuition Fee Challan', 'Mobile OTP Verified (+91 94401 56789)', '2026-11-01T08:15:00Z', '2026-11-01T08:20:00Z', '2026-11-01T08:28:00Z', 0).lastInsertRowid as number;
  insertLog.run(t1, null, 'waiting', user2Id, 'Token dispensed via Customer Portal', '2026-11-01T08:15:00Z');
  insertLog.run(t1, 'waiting', 'now_serving', adminId, 'Called to Counter 1 (Accounts)', '2026-11-01T08:20:00Z');
  insertLog.run(t1, 'now_serving', 'served', adminId, 'Challan verified and stamped', '2026-11-01T08:28:00Z');

  // Token 102 - Now Serving
  const t2 = insertToken.run(gvpFee, gvp, user3Id, 'Kiran Varma', '+91 98660 99887', 'kiran.varma@gmail.com', 'GVP-FEE-102', 102, 'now_serving', 'Counter 1 (Accounts)', 'Bus Pass Fee Renewal', 'Gmail Verified (kiran.varma@gmail.com)', '2026-11-01T08:25:00Z', '2026-11-01T08:30:00Z', null, 0).lastInsertRowid as number;
  insertLog.run(t2, null, 'waiting', user3Id, 'Token dispensed via Customer Portal', '2026-11-01T08:25:00Z');
  insertLog.run(t2, 'waiting', 'now_serving', adminId, 'Called to Counter 1 (Accounts)', '2026-11-01T08:30:00Z');

  // Token 103 - Waiting (assigned to demo user Harsha Patnaik so he sees his live position!)
  const t3 = insertToken.run(gvpFee, gvp, user1Id, 'Harsha Patnaik', '+91 98480 12345', 'harsha.student@gmail.com', 'GVP-FEE-103', 103, 'waiting', null, 'College Fee Payment & Receipt', 'Mobile & Gmail Verified', '2026-11-01T08:32:00Z', null, null, 7).lastInsertRowid as number;
  insertLog.run(t3, null, 'waiting', user1Id, 'Token dispensed via Customer Portal', '2026-11-01T08:32:00Z');

  // GVP Certificates Queue:
  // Token 101 - Now Serving
  const t4 = insertToken.run(gvpCert, gvp, user2Id, 'Pooja Sharma', '+91 94401 56789', 'pooja.sharma@gmail.com', 'GVP-CRT-101', 101, 'now_serving', 'Autonomous Cell Desk 3', 'Receiving Consolidated Marks Memo (CMM)', 'Mobile OTP Verified', '2026-11-01T08:20:00Z', '2026-11-01T08:28:00Z', null, 0).lastInsertRowid as number;
  insertLog.run(t4, null, 'waiting', user2Id, 'Token dispensed via Customer Portal', '2026-11-01T08:20:00Z');
  insertLog.run(t4, 'waiting', 'now_serving', adminId, 'Called to Autonomous Cell Desk 3', '2026-11-01T08:28:00Z');
}
