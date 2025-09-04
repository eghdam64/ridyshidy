import { pool } from '../../lib/db';

export default async function handler(req, res) {
  try {
    console.log('=== DATABASE DEBUG INFO ===');
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_PORT:', process.env.DB_PORT);
    console.log('DB_NAME:', process.env.DB_NAME);
    console.log('DB_USER:', process.env.DB_USER);
    console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');

    // Verbindungstest
    const result = await pool.query('SELECT current_database(), current_user, version()');
    console.log('✅ Connection successful');
    
    // Tabellen anzeigen
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('✅ Tables found:', tables.rows.map(t => t.table_name));

    res.status(200).json({
      status: 'SUCCESS',
      connection: result.rows[0],
      tables: tables.rows.map(t => t.table_name),
      env: {
        DB_HOST: process.env.DB_HOST,
        DB_NAME: process.env.DB_NAME,
        DB_USER: process.env.DB_USER,
        DB_PASSWORD_SET: !!process.env.DB_PASSWORD
      }
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({ 
      status: 'ERROR',
      error: error.message,
      code: error.code,
      env: {
        DB_HOST: process.env.DB_HOST,
        DB_NAME: process.env.DB_NAME,
        DB_USER: process.env.DB_USER,
        DB_PASSWORD_SET: !!process.env.DB_PASSWORD
      }
    });
  }
}
