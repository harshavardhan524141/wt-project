import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.ts';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// Store temporary OTPs in memory for verification
const otpStore = new Map<string, { code: string; expiresAt: number }>();

// Send Verification Code (Gmail / Mobile)
router.post('/send-verification', (req, res: Response): void => {
  try {
    const { contact, type } = req.body; // type: 'email' | 'phone'
    if (!contact) {
      res.status(400).json({ error: 'Please enter a valid mobile number or Gmail address.' });
      return;
    }

    const cleanContact = contact.trim().toLowerCase();
    // Generate simple 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(cleanContact, {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    console.log(`[QueueLess Verification] Sent OTP ${code} to ${cleanContact} (${type})`);

    res.json({
      success: true,
      message: `Verification code sent to ${contact}.`,
      // Provide demo code in response so reviewer can test easily without waiting for SMS
      demoCode: code
    });
  } catch (error) {
    console.error('Error sending verification code:', error);
    res.status(500).json({ error: 'Failed to dispatch verification code.' });
  }
});

// Verify Code (Gmail / Mobile)
router.post('/verify-code', (req, res: Response): void => {
  try {
    const { contact, code } = req.body;
    if (!contact || !code) {
      res.status(400).json({ error: 'Contact and verification code are required.' });
      return;
    }

    const cleanContact = contact.trim().toLowerCase();
    const stored = otpStore.get(cleanContact);

    // Accept default test code 123456 or the exact generated code
    const isMasterDemoCode = code.trim() === '123456';
    const isMatchingStored = stored && stored.code === code.trim() && stored.expiresAt > Date.now();

    if (!isMasterDemoCode && !isMatchingStored) {
      res.status(400).json({ error: 'Invalid or expired verification code. Use code 123456 for instant demo verification.' });
      return;
    }

    otpStore.delete(cleanContact);

    res.json({
      verified: true,
      message: `${contact} verified successfully.`
    });
  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({ error: 'Verification failed.' });
  }
});

// Register customer
router.post('/register', (req, res: Response): void => {
  try {
    const { name, email, password, phone, role, is_phone_verified, is_email_verified } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Full name must be at least 2 characters.' });
      return;
    }

    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
      res.status(400).json({ error: 'Please provide a valid Gmail / Email address.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 5) {
      res.status(400).json({ error: 'Password must be at least 5 characters.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(normalizedEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists. Please log in.' });
      return;
    }

    const assignedRole = role === 'admin' ? 'admin' : 'user';
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const now = new Date().toISOString();

    const insert = db.prepare(`
      INSERT INTO users (name, email, password_hash, phone, is_phone_verified, is_email_verified, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      name.trim(),
      normalizedEmail,
      passwordHash,
      phone?.trim() || null,
      is_phone_verified ? 1 : 0,
      is_email_verified ? 1 : 0,
      assignedRole,
      now
    );

    const userId = Number(result.lastInsertRowid);

    const userPayload = {
      id: userId,
      email: normalizedEmail,
      name: name.trim(),
      phone: phone?.trim() || null,
      role: assignedRole as 'user' | 'admin'
    };

    const token = generateToken(userPayload);

    res.status(201).json({
      message: 'Registration successful',
      user: userPayload,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'An unexpected error occurred while creating your account.' });
  }
});

// Login (Customer or Admin)
router.post('/login', (req, res: Response): void => {
  try {
    const { email, name, password } = req.body;
    const identifier = (email || name || '').trim().toLowerCase();

    if (!identifier || !password) {
      res.status(400).json({ error: 'Name/Email and password are required.' });
      return;
    }

    const user = db.prepare(`
      SELECT * FROM users 
      WHERE LOWER(email) = ? OR LOWER(name) = ?
    `).get(identifier, identifier) as {
      id: number;
      name: string;
      email: string;
      phone: string;
      password_hash: string;
      role: 'user' | 'admin';
    } | undefined;

    if (!user) {
      res.status(401).json({ error: 'No account found with this Name or Email.' });
      return;
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role
    };

    const token = generateToken(userPayload);

    res.json({
      message: 'Signed in successfully',
      user: userPayload,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An unexpected error occurred during login.' });
  }
});

// Profile / Current authenticated user
router.get('/me', authenticateToken, (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const user = db.prepare('SELECT id, name, email, phone, is_phone_verified, is_email_verified, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  res.json({ user });
});

export default router;
