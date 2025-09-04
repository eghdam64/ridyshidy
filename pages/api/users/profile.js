// /var/www/ridyshidy/packages/pages/api/users/profile.js
import { pool } from '../../../../lib/db';
import { verifyToken } from '../../../../lib/auth';

export default async function handler(req, res) {
  const user = await verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Nicht autorisiert' });
  }

  if (req.method === 'GET') {
    try {
      const result = await pool.query(`
        SELECT 
          u.id, u.email, u.first_name, u.last_name, u.phone, u.user_type,
          u.rating, u.total_ratings, u.total_rides_offered, u.total_rides_taken,
          u.language_preference, u.notification_preferences,
          p.bio, p.occupation, p.interests, p.smoking_allowed, p.pets_allowed,
          p.music_preference, p.chat_preference, p.emergency_contact_name,
          p.emergency_contact_phone, p.identity_verified, p.license_verified
        FROM users u
        LEFT JOIN user_profiles p ON u.id = p.user_id
        WHERE u.id = $1
      `, [user.userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden' });
      }

      res.status(200).json({ profile: result.rows[0] });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }

  else if (req.method === 'PUT') {
    try {
      const {
        firstName, lastName, phone, bio, occupation, interests,
        smokingAllowed, petsAllowed, musicPreference, chatPreference,
        emergencyContactName, emergencyContactPhone, languagePreference,
        notificationPreferences
      } = req.body;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Update users table
        await client.query(`
          UPDATE users 
          SET first_name = $1, last_name = $2, phone = $3, 
              language_preference = $4, notification_preferences = $5,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $6
        `, [firstName, lastName, phone, languagePreference, JSON.stringify(notificationPreferences), user.userId]);

        // Update user_profiles table
        await client.query(`
          INSERT INTO user_profiles (
            user_id, bio, occupation, interests, smoking_allowed, pets_allowed,
            music_preference, chat_preference, emergency_contact_name, emergency_contact_phone
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (user_id) DO UPDATE SET
            bio = EXCLUDED.bio,
            occupation = EXCLUDED.occupation,
            interests = EXCLUDED.interests,
            smoking_allowed = EXCLUDED.smoking_allowed,
            pets_allowed = EXCLUDED.pets_allowed,
            music_preference = EXCLUDED.music_preference,
            chat_preference = EXCLUDED.chat_preference,
            emergency_contact_name = EXCLUDED.emergency_contact_name,
            emergency_contact_phone = EXCLUDED.emergency_contact_phone,
            updated_at = CURRENT_TIMESTAMP
        `, [
          user.userId, bio, occupation, interests, smokingAllowed, petsAllowed,
          musicPreference, chatPreference, emergencyContactName, emergencyContactPhone
        ]);

        await client.query('COMMIT');
        res.status(200).json({ message: 'Profil erfolgreich aktualisiert' });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }

  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

