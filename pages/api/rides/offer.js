import { pool } from '../../../lib/db';
import { verifyToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Bitte melden Sie sich an' });
    }

    if (user.userType === 'passenger') {
      return res.status(403).json({ error: 'Nur Fahrer können Fahrten anbieten' });
    }

    const { from, to, date, time, availableSeats, price, description } = req.body;

    console.log('Offering ride:', { from, to, date, time, availableSeats, price });

    if (!from || !to || !date || !time || !availableSeats || !price) {
      return res.status(400).json({ error: 'Alle Pflichtfelder sind erforderlich' });
    }

    const result = await pool.query(
      `INSERT INTO rides (driver_id, from_location, to_location, departure_date, departure_time, available_seats, total_seats, price_per_seat, description)
       VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8) RETURNING *`,
      [user.userId, from, to, date, time, parseInt(availableSeats), parseFloat(price), description || '']
    );

    // Update user statistics
    await pool.query(
      'UPDATE users SET total_rides_offered = total_rides_offered + 1 WHERE id = $1',
      [user.userId]
    );

    console.log('Ride created successfully:', result.rows[0].id);

    res.status(201).json({
      message: 'Fahrt erfolgreich veröffentlicht!',
      ride: result.rows[0]
    });

  } catch (error) {
    console.error('Offer ride error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
