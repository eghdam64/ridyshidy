// /var/www/ridyshidy/packages/pages/api/dashboard/driver.js
import { pool } from '../../../lib/db';
import { verifyToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }

    if (user.userType === 'passenger') {
      return res.status(403).json({ error: 'Nur für Fahrer verfügbar' });
    }

    // Get driver statistics
    const statsResult = await pool.query(`
      SELECT 
        COUNT(CASE WHEN r.status = 'active' THEN 1 END) as active_rides,
        COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_rides,
        COUNT(CASE WHEN r.status = 'cancelled' THEN 1 END) as cancelled_rides,
        SUM(CASE WHEN r.status = 'completed' THEN r.price_per_seat * (r.total_seats - r.available_seats) ELSE 0 END) as total_earnings
      FROM rides r 
      WHERE r.driver_id = $1
    `, [user.userId]);

    // Get upcoming rides
    const upcomingRidesResult = await pool.query(`
      SELECT 
        r.*, 
        COUNT(rb.id) as total_bookings,
        SUM(rb.seats_booked) as booked_seats,
        array_agg(
          json_build_object(
            'passenger_name', u.first_name || ' ' || u.last_name,
            'seats', rb.seats_booked,
            'booking_id', rb.id,
            'status', rb.status
          )
        ) FILTER (WHERE rb.id IS NOT NULL) as bookings
      FROM rides r
      LEFT JOIN ride_bookings rb ON r.id = rb.ride_id AND rb.status = 'confirmed'
      LEFT JOIN users u ON rb.passenger_id = u.id
      WHERE r.driver_id = $1 
        AND r.departure_date >= CURRENT_DATE
        AND r.status IN ('active', 'full')
      GROUP BY r.id
      ORDER BY r.departure_date ASC, r.departure_time ASC
      LIMIT 10
    `, [user.userId]);

    // Get recent bookings
    const recentBookingsResult = await pool.query(`
      SELECT 
        rb.*,
        r.from_location, r.to_location, r.departure_date, r.departure_time,
        u.first_name, u.last_name, u.email, u.phone
      FROM ride_bookings rb
      JOIN rides r ON rb.ride_id = r.id
      JOIN users u ON rb.passenger_id = u.id
      WHERE r.driver_id = $1
      ORDER BY rb.created_at DESC
      LIMIT 10
    `, [user.userId]);

    res.status(200).json({
      statistics: statsResult.rows[0],
      upcomingRides: upcomingRidesResult.rows,
      recentBookings: recentBookingsResult.rows
    });

  } catch (error) {
    console.error('Driver dashboard error:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
}

