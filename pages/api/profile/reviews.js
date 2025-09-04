// pages/api/profile/reviews.js
// Bewertungen API

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const tokenPayload = verifyToken(req);
  if (!tokenPayload) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized' 
    });
  }

  const userId = tokenPayload.userId;

  try {
    switch (req.method) {
      case 'GET':
        const { type = 'received' } = req.query;

        if (type === 'received') {
          // Erhaltene Bewertungen
          const reviews = await prisma.review.findMany({
            where: { revieweeId: userId },
            include: {
              reviewer: {
                select: { 
                  firstName: true, 
                  lastName: true,
                  profile: {
                    select: { avatarUrl: true }
                  }
                }
              },
              booking: {
                select: {
                  ride: {
                    select: { startLocation: true, endLocation: true }
                  }
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          });

          return res.status(200).json({
            success: true,
            data: reviews
          });
        } else {
          // Gegebene Bewertungen
          const reviews = await prisma.review.findMany({
            where: { reviewerId: userId },
            include: {
              reviewee: {
                select: { 
                  firstName: true, 
                  lastName: true,
                  profile: {
                    select: { avatarUrl: true }
                  }
                }
              },
              booking: {
                select: {
                  ride: {
                    select: { startLocation: true, endLocation: true }
                  }
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          });

          return res.status(200).json({
            success: true,
            data: reviews
          });
        }

      case 'POST':
        // Neue Bewertung erstellen
        const { bookingId, rating, comment } = req.body;

        if (!bookingId || !rating) {
          return res.status(400).json({
            success: false,
            message: 'Booking ID und Bewertung sind erforderlich'
          });
        }

        if (rating < 1 || rating > 5) {
          return res.status(400).json({
            success: false,
            message: 'Bewertung muss zwischen 1 und 5 liegen'
          });
        }

        // Prüfen ob Buchung existiert und Benutzer berechtigt ist
        const booking = await prisma.booking.findFirst({
          where: {
            id: bookingId,
            OR: [
              { passengerId: userId },
              { ride: { driverId: userId } }
            ],
            status: 'COMPLETED'
          },
          include: {
            ride: true
          }
        });

        if (!booking) {
          return res.status(404).json({
            success: false,
            message: 'Buchung nicht gefunden oder nicht berechtigt'
          });
        }

        // Bestimmen wer bewertet wird
        const revieweeId = booking.passengerId === userId 
          ? booking.ride.driverId 
          : booking.passengerId;

        // Prüfen ob bereits bewertet
        const existingReview = await prisma.review.findFirst({
          where: {
            bookingId: bookingId,
            reviewerId: userId
          }
        });

        if (existingReview) {
          return res.status(400).json({
            success: false,
            message: 'Sie haben bereits eine Bewertung für diese Fahrt abgegeben'
          });
        }

        const newReview = await prisma.review.create({
          data: {
            bookingId,
            reviewerId: userId,
            revieweeId,
            rating,
            comment: comment || null
          }
        });

        return res.status(201).json({
          success: true,
          message: 'Bewertung erfolgreich abgegeben',
          data: newReview
        });

      default:
        return res.status(405).json({ 
          success: false, 
          message: 'Method not allowed' 
        });
    }
  } catch (error) {
    console.error('Reviews API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    await prisma.$disconnect();
  }
}
