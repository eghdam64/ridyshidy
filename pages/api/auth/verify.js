import { pool } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, code } = req.body;

    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND verification_code = $2 AND verification_expires_at > NOW()',
      [email, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Ungültiger oder abgelaufener Code' });
    }

    await pool.query(
      'UPDATE users SET is_verified = TRUE, verification_code = NULL WHERE id = $1',
      [result.rows[0].id]
    );

    res.status(200).json({ message: 'E-Mail verifiziert' });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
