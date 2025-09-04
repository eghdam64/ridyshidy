import { pool } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { from, to, date, passengers = 1 } = req.query;

    const query = `
      SELECT 
        r.id, r.from_location, r.to_location, r.departure_date, r.departure_time,
        r.available_seats, r.price_per_seat, r.description,
        u.first_name, u.last_name, u.rating
      FROM rides r
      JOIN users u ON r.driver_id = u.id
      WHERE 
        LOWER(r.from_location) LIKE LOWER($1) 
        AND LOWER(r.to_location) LIKE LOWER($2)
        AND r.departure_date >= $3
        AND r.available_seats >= $4
        AND r.status = 'active'
      ORDER BY r.departure_date ASC, r.departure_time ASC
    `;

    const result = await pool.query(query, [
      `%${from}%`,
      `%${to}%`,
      date || new Date().toISOString().split('T')[0],
      parseInt(passengers)
    ]);

    const rides = result.rows.map(row => ({
      id: row.id,
      from: row.from_location,
      to: row.to_location,
      date: row.departure_date,
      time: row.departure_time,
      availableSeats: row.available_seats,
      price: row.price_per_seat,
      description: row.description,
      driver: {
        name: `${row.first_name} ${row.last_name}`,
        rating: row.rating || 0,
        initials: `${row.first_name.charAt(0)}${row.last_name.charAt(0)}`
      }
    }));

    res.status(200).json({ rides });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
