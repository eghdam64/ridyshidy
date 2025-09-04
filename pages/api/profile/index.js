// pages/api/profile/index.js
// Hauptprofil API für Fahrer/Mitfahrer

import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// JWT Token Verification
function verifyToken(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Token verifizieren
  const tokenPayload = verifyToken(req);
  if (!tokenPayload) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized - Invalid or missing token' 
    });
  }

  const userId = tokenPayload.userId;

  try {
    switch (req.method) {
      case 'GET':
        // Vollständiges Profil abrufen mit Beziehungen
        const userProfile = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            profile: true,
            vehicles: {
              where: { isActive: true }
            },
            driverRides: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              include: {
                bookings: {
                  select: {
                    id: true,
                    status: true,
                    passenger: {
                      select: { id: true, firstName: true, lastName: true }
                    }
                  }
                }
              }
            },
            passengerBookings: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              include: {
                ride: {
                  select: {
                    id: true,
                    startLocation: true,
                    endLocation: true,
                    departureTime: true,
                    driver: {
                      select: { id: true, firstName: true, lastName: true }
                    }
                  }
                }
              }
            },
            reviewsGiven: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              include: {
                reviewee: {
                  select: { firstName: true, lastName: true }
                }
              }
            },
            reviewsReceived: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              include: {
                reviewer: {
                  select: { firstName: true, lastName: true }
                }
              }
            }
          }
        });

        if (!userProfile) {
          return res.status(404).json({ 
            success: false, 
            message: 'User not found' 
          });
        }

        // Statistiken berechnen
        const stats = await calculateUserStats(userId);
        
        const { password, ...profileData } = userProfile;
        
        return res.status(200).json({
          success: true,
          data: {
            ...profileData,
            stats
          }
        });

      case 'PUT':
        // Profil aktualisieren
        const { 
          firstName, 
          lastName, 
          phone, 
          bio,
          isDriver,
          profileData 
        } = req.body;

        // Grundlegende Validierung
        if (!firstName || firstName.trim().length < 2) {
          return res.status(400).json({
            success: false,
            message: 'Vorname muss mindestens 2 Zeichen lang sein'
          });
        }

        if (!lastName || lastName.trim().length < 2) {
          return res.status(400).json({
            success: false,
            message: 'Nachname muss mindestens 2 Zeichen lang sein'
          });
        }

        if (phone && !/^[\+]?[1-9][\d\s\-\(\)]{8,}$/.test(phone)) {
          return res.status(400).json({
            success: false,
            message: 'Ungültige Telefonnummer'
          });
        }

        // Transaction für atomare Updates
        const updatedUser = await prisma.$transaction(async (tx) => {
          // Benutzer aktualisieren
          const user = await tx.user.update({
            where: { id: userId },
            data: {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              phone: phone || null,
              isDriver: isDriver || false,
              updatedAt: new Date()
            }
          });

          // Profil erstellen oder aktualisieren
          const profile = await tx.profile.upsert({
            where: { userId: userId },
            update: {
              bio: bio || null,
              location: profileData?.location || null,
              emergencyContact: profileData?.emergencyContact || null,
              preferences: profileData?.preferences || {},
              updatedAt: new Date()
            },
            create: {
              userId: userId,
              bio: bio || null,
              location: profileData?.location || null,
              emergencyContact: profileData?.emergencyContact || null,
              preferences: profileData?.preferences || {}
            }
          });

          return { user, profile };
        });

        return res.status(200).json({
          success: true,
          message: 'Profil erfolgreich aktualisiert',
          data: {
            ...updatedUser.user,
            profile: updatedUser.profile
          }
        });

      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).json({ 
          success: false, 
          message: `Method ${req.method} not allowed` 
        });
    }
  } catch (error) {
    console.error('Profile API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    await prisma.$disconnect();
  }
}

// Benutzerstatistiken berechnen
async function calculateUserStats(userId) {
  try {
    const [
      totalRidesAsDriver,
      totalRidesAsPassenger,
      completedRidesAsDriver,
      completedRidesAsPassenger,
      cancelledBookings,
      avgRating,
      totalEarnings,
      totalSpent
    ] = await Promise.all([
      // Fahrten als Fahrer
      prisma.ride.count({
        where: { driverId: userId }
      }),
      
      // Fahrten als Mitfahrer
      prisma.booking.count({
        where: { passengerId: userId }
      }),
      
      // Abgeschlossene Fahrten als Fahrer
      prisma.ride.count({
        where: { 
          driverId: userId,
          status: 'COMPLETED'
        }
      }),
      
      // Abgeschlossene Fahrten als Mitfahrer
      prisma.booking.count({
        where: { 
          passengerId: userId,
          status: 'COMPLETED'
        }
      }),
      
      // Stornierte Buchungen
      prisma.booking.count({
        where: { 
          passengerId: userId,
          status: 'CANCELLED'
        }
      }),
      
      // Durchschnittliche Bewertung
      prisma.review.aggregate({
        where: { revieweeId: userId },
        _avg: { rating: true },
        _count: { rating: true }
      }),
      
      // Verdienste als Fahrer
      prisma.booking.aggregate({
        where: {
          ride: { driverId: userId },
          status: 'COMPLETED'
        },
        _sum: { amount: true }
      }),
      
      // Ausgaben als Mitfahrer
      prisma.booking.aggregate({
        where: {
          passengerId: userId,
          status: 'COMPLETED'
        },
        _sum: { amount: true }
      })
    ]);

    return {
      rides: {
        asDriver: totalRidesAsDriver,
        asPassenger: totalRidesAsPassenger,
        completedAsDriver: completedRidesAsDriver,
        completedAsPassenger: completedRidesAsPassenger
      },
      cancellations: cancelledBookings,
      rating: {
        average: avgRating._avg.rating || 0,
        count: avgRating._count.rating || 0
      },
      financial: {
        earned: totalEarnings._sum.amount || 0,
        spent: totalSpent._sum.amount || 0
      }
    };
  } catch (error) {
    console.error('Stats calculation error:', error);
    return null;
  }
}

