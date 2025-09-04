import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../../lib/db';
import { validateEmail, validatePassword } from '../../../lib/validation';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { firstName, lastName, email, phone, password, userType } = req.body;

    if (!firstName || !lastName || !email || !password || !userType) {
      return res.status(400).json({ error: 'Alle Felder sind erforderlich' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' });
    }

    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'E-Mail bereits registriert' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, user_type, verification_code, verification_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [email, passwordHash, firstName, lastName, phone, userType, verificationCode, new Date(Date.now() + 24 * 60 * 60 * 1000)]
    );

    console.log(`Verification code for ${email}: ${verificationCode}`);

    res.status(201).json({
      message: 'Registrierung erfolgreich',
      userId: result.rows[0].id,
      verificationCode: verificationCode // Nur für Demo!
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
