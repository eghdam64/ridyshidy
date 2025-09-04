import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Login attempt:', req.body);

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich' });
    }

    console.log('Searching for user:', email);

    const result = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name, user_type, is_verified, is_active FROM users WHERE email = $1',
      [email]
    );

    console.log('Database result:', result.rows.length, 'users found');

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Benutzer nicht gefunden' });
    }

    const user = result.rows[0];
    console.log('User found:', user.email, 'verified:', user.is_verified, 'active:', user.is_active);

    if (!user.is_active) {
      return res.status(401).json({ error: 'Konto deaktiviert' });
    }

    if (!user.is_verified) {
      return res.status(401).json({ error: 'E-Mail nicht verifiziert. Bitte registrieren Sie sich erst.' });
    }

    console.log('Verifying password...');
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('Password valid:', isValidPassword);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Falsches Passwort' });
    }

    // JWT Secret prüfen
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not found in environment variables');
      return res.status(500).json({ error: 'Server-Konfigurationsfehler' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, userType: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Login successful for:', user.email);

    res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
