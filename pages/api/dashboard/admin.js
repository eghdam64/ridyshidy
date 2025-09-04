// /var/www/ridyshidy/packages/pages/api/dashboard/admin.js
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

    // Check if user is admin
    const adminResult = await pool.query(
      'SELECT role FROM admin_users WHERE user_id = $1',
      [user.userId]
    );

    if (adminResult.rows.length === 0) {
      return res.status(403).json({ error: 'Admin-Berechtigung erforderlich' });
    }

    // Get system statistics
    const systemStatsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
        (SELECT COUNT(*) FROM users WHERE user_type = 'driver' OR user_type = 'both') as total_drivers,
        (SELECT COUNT(*) FROM users WHERE user_type = 'passenger' OR user_type = 'both') as total_passengers,
        (SELECT COUNT(*) FROM rides WHERE status = 'active') as active_rides,
        (SELECT COUNT(*) FROM rides WHERE status = 'completed') as completed_rides,
        (SELECT COUNT(*) FROM ride_bookings WHERE status = 'confirmed') as total_bookings,
        (SELECT SUM(total_price) FROM ride_bookings WHERE payment_status = 'paid') as total_revenue,
        (SELECT COUNT(*) FROM reported_issues WHERE status = 'open') as open_issues
    `);

    // Get recent activity
    const recentActivityResult = await pool.query(`
      (SELECT 'user_registration' as type, first_name || ' ' || last_name as description, created_at
       FROM users 
       ORDER BY created_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'ride_posted' as type, 'Fahrt von ' || from_location || ' nach ' || to_location as description, created_at
       FROM rides 
       ORDER BY created_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'booking_made' as type, 'Neue Buchung' as description, created_at
       FROM ride_bookings 
       ORDER BY created_at DESC LIMIT 5)
      ORDER BY created_at DESC LIMIT 15
    `);

    // Get monthly statistics
    const monthlyStatsResult = await pool.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as registrations
      FROM users 
      WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `);

    res.status(200).json({
      systemStats: systemStatsResult.rows[0],
      recentActivity: recentActivityResult.rows,
      monthlyStats: monthlyStatsResult.rows,
      adminRole: adminResult.rows[0].role
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
}

