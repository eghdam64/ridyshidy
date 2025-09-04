// /var/www/ridyshidy/packages/pages/api/rides/[id]/cancel.js
import { pool } from '../../../../../lib/db';
import { verifyToken } from '../../../../../lib/auth';
import { sendCancellationEmail } from '../../../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }

    const { id: rideId } = req.query;
    const { reason } = req.body;

    // Get ride details
    const rideResult = await pool.query(
      `SELECT * FROM rides WHERE id = $1 AND driver_id = $2`,
      [rideId, user.userId]
    );

    if (rideResult.rows.length === 0) {
      return res.status(404).json({ error: 'Fahrt nicht gefunden oder Sie sind nicht der Fahrer' });
    }

    const ride = rideResult.rows[0];

    if (ride.status === 'cancelled') {
      return res.status(400).json({ error: 'Fahrt ist bereits storniert' });
    }

    // Get all bookings for this ride
    const bookingsResult = await pool.query(
      `SELECT rb.*, u.email, u.first_name, u.last_name
       FROM ride_bookings rb
       JOIN users u ON rb.passenger_id = u.id
       WHERE rb.ride_id = $1 AND rb.status = 'confirmed'`,
      [rideId]
    );

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Cancel the ride
      await client.query(
        `UPDATE rides 
         SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [rideId]
      );

      // Cancel all bookings
      await client.query(
        `UPDATE ride_bookings 
         SET status = 'cancelled', cancelled_by = $1, cancellation_reason = $2, cancelled_at = CURRENT_TIMESTAMP
         WHERE ride_id = $3 AND status = 'confirmed'`,
        [user.userId, reason, rideId]
      );

      await client.query('COMMIT');

      // Send cancellation emails to all passengers
      for (const booking of bookingsResult.rows) {
        await sendCancellationEmail({
          passengerEmail: booking.email,
          passengerName: `${booking.first_name} ${booking.last_name}`,
          ride: ride,
          reason: reason
        });
      }

      res.status(200).json({
        message: 'Fahrt erfolgreich storniert',
        notifiedPassengers: bookingsResult.rows.length
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Cancellation error:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
}

