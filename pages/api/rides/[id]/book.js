// /var/www/ridyshidy/packages/pages/api/rides/[id]/book.js
import { pool } from '../../../../../lib/db';
import { verifyToken } from '../../../../../lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { sendBookingConfirmationEmail } from '../../../../../lib/email';

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
    const { seatsToBook = 1 } = req.body;

    // Get ride details
    const rideResult = await pool.query(
      `SELECT r.*, u.first_name, u.last_name, u.email as driver_email
       FROM rides r
       JOIN users u ON r.driver_id = u.id
       WHERE r.id = $1 AND r.status = 'active'`,
      [rideId]
    );

    if (rideResult.rows.length === 0) {
      return res.status(404).json({ error: 'Fahrt nicht gefunden oder nicht verfügbar' });
    }

    const ride = rideResult.rows[0];

    if (ride.driver_id === user.userId) {
      return res.status(400).json({ error: 'Sie können Ihre eigene Fahrt nicht buchen' });
    }

    if (ride.available_seats < seatsToBook) {
      return res.status(400).json({ error: 'Nicht genügend Plätze verfügbar' });
    }

    // Check if already booked
    const existingBooking = await pool.query(
      'SELECT id FROM ride_bookings WHERE ride_id = $1 AND passenger_id = $2',
      [rideId, user.userId]
    );

    if (existingBooking.rows.length > 0) {
      return res.status(400).json({ error: 'Sie haben diese Fahrt bereits gebucht' });
    }

    const bookingToken = uuidv4();
    const totalPrice = ride.price_per_seat * seatsToBook;

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create booking
      const bookingResult = await client.query(
        `INSERT INTO ride_bookings (ride_id, passenger_id, seats_booked, total_price, booking_token, status)
         VALUES ($1, $2, $3, $4, $5, 'confirmed')
         RETURNING id`,
        [rideId, user.userId, seatsToBook, totalPrice, bookingToken]
      );

      // Update available seats
      await client.query(
        `UPDATE rides 
         SET available_seats = available_seats - $1,
             status = CASE WHEN available_seats - $1 = 0 THEN 'full' ELSE status END
         WHERE id = $2`,
        [seatsToBook, rideId]
      );

      // Update user statistics
      await client.query(
        'UPDATE users SET total_rides_taken = total_rides_taken + 1 WHERE id = $1',
        [user.userId]
      );

      await client.query('COMMIT');

      // Send confirmation emails
      await sendBookingConfirmationEmail({
        passengerEmail: user.email,
        driverEmail: ride.driver_email,
        ride: ride,
        booking: {
          id: bookingResult.rows[0].id,
          token: bookingToken,
          seats: seatsToBook,
          totalPrice: totalPrice
        }
      });

      res.status(200).json({
        message: 'Fahrt erfolgreich gebucht',
        bookingId: bookingResult.rows[0].id,
        bookingToken: bookingToken
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
}

