// /var/www/ridyshidy/packages/pages/api/messages/index.js
import { pool } from '../../../../lib/db';
import { verifyToken } from '../../../../lib/auth';

export default async function handler(req, res) {
  const user = await verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Nicht autorisiert' });
  }

  if (req.method === 'GET') {
    try {
      const { rideId } = req.query;

      let query = `
        SELECT 
          m.*,
          sender.first_name as sender_first_name,
          sender.last_name as sender_last_name,
          recipient.first_name as recipient_first_name,
          recipient.last_name as recipient_last_name
        FROM messages m
        JOIN users sender ON m.sender_id = sender.id
        JOIN users recipient ON m.recipient_id = recipient.id
        WHERE (m.sender_id = $1 OR m.recipient_id = $1)
      `;
      const params = [user.userId];

      if (rideId) {
        query += ' AND m.ride_id = $2';
        params.push(rideId);
      }

      query += ' ORDER BY m.created_at ASC';

      const result = await pool.query(query, params);

      res.status(200).json({ messages: result.rows });

    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }

  else if (req.method === 'POST') {
    try {
      const { recipientId, rideId, content, messageType = 'text' } = req.body;

      if (!recipientId || !content) {
        return res.status(400).json({ error: 'Empfänger und Inhalt sind erforderlich' });
      }

      const result = await pool.query(`
        INSERT INTO messages (sender_id, recipient_id, ride_id, content, message_type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [user.userId, recipientId, rideId, content, messageType]);

      // Create notification for recipient
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, related_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        recipientId,
        'Neue Nachricht',
        `Sie haben eine neue Nachricht erhalten`,
        'message',
        result.rows[0].id
      ]);

      res.status(201).json({ message: result.rows[0] });

    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }

  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

