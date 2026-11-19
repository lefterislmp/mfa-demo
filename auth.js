const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const db = require('../config/db');

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.execute(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );
    res.json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Αν ο χρήστης έχει ενεργοποιημένο TOTP, εκδίδουμε pre-auth token
    // αντί για πλήρες JWT — ο χρήστης πρέπει να επαληθεύσει τον 2ο παράγοντα πρώτα
    if (user.totp_enabled) {
      const preAuthToken = jwt.sign(
        { userId: user.id, preAuth: true },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
      );
      return res.json({ requiresTOTP: true, preAuthToken });
    }

    // Αν δεν έχει TOTP, εκδίδουμε κανονικό JWT
    // (ο χρήστης μπορεί να ρυθμίσει TOTP αργότερα μέσω /totp/setup)
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ token, userId: user.id });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Middleware: επαλήθευση pre-auth token (για /totp/setup και /totp/verify)
function verifyPreAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
  if (!token) {
    return res.status(401).json({ error: 'Pre-auth token required' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.preAuth) {
      return res.status(403).json({ error: 'Invalid token type' });
    }
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired pre-auth token' });
  }
}

// TOTP Setup
router.post('/totp/setup', verifyPreAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const secret = authenticator.generateSecret();
    const [rows] = await db.execute(
      'SELECT username FROM users WHERE id = ?',
      [userId]
    );
    const username = rows[0].username;
    await db.execute(
      'UPDATE users SET totp_secret = ? WHERE id = ?',
      [secret, userId]
    );
    const otpauth = authenticator.keyuri(username, 'MFA Demo', secret);
    const qrCode = await QRCode.toDataURL(otpauth);
    res.json({ secret, qrCode });
  } catch (error) {
    console.error('TOTP setup error:', error);
    res.status(500).json({ error: 'TOTP setup failed' });
  }
});

// TOTP Verify
router.post('/totp/verify', verifyPreAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { token } = req.body;
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    const user = rows[0];
    const isValid = authenticator.verify({
      token: token,
      secret: user.totp_secret
    });
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid TOTP token' });
    }
    await db.execute(
      'UPDATE users SET totp_enabled = TRUE WHERE id = ?',
      [userId]
    );
    // Εκδίδει κανονικό JWT μετά την επιτυχή επαλήθευση
 TOTP
    const jwtToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ token: jwtToken });
  } catch (error) {
    res.status(500).json({ error: 'TOTP verification failed' });
  }
});

module.exports = router;