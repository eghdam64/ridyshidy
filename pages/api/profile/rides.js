// pages/api/profile/rides.js
// Fahrtenverlauf API

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
  const { type, page = 1, limit = 10 } = req.query;

  try {
    switch (req.method) {
      case 'GET':
        const offset = (parseInt(page) - 1) * parseInt(limit);

        if (type === 'driver') {
          // Fahrten als Fahrer
          const [rides, total] = await Promise.all([
            prisma.ride.findMany({
              where: { driverId: userId },
              include: {
                bookings: {
                  include: {
                    passenger: {
                      select: { 
                        id: true, 
                        firstName: true, 
                        lastName: true,
                        profile: {
                          select: { avatarUrl: true }
                        }
                      }
                    }
                  }
                },
                vehicle: {
                  select: { make: true, model: true, color: true, licensePlate: true }
                }
              },
              orderBy: { createdAt: 'desc' },
              skip: offset,
              take: parseInt(limit)
            }),
            prisma.ride.count({
              where: { driverId: userId }
            })
          ]);

          return res.status(200).json({
            success: true,
            data: {
              rides,
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
              }
            }
          });
        } else if (type === 'passenger') {
          // Fahrten als Mitfahrer
          const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
              where: { passengerId: userId },
              include: {
                ride: {
                  include: {
                    driver: {
                      select: { 
                        id: true, 
                        firstName: true, 
                        lastName: true,
                        profile: {
                          select: { avatarUrl: true }
                        }
                      }
                    },
                    vehicle: {
                      select: { make: true, model: true, color: true, licensePlate: true }
                    }
                  }
                }
              },
              orderBy: { createdAt: 'desc' },
              skip: offset,
              take: parseInt(limit)
            }),
            prisma.booking.count({
              where: { passengerId: userId }
            })
          ]);

          return res.status(200).json({
            success: true,
            data: {
              bookings,
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
              }
            }
          });
        } else {
          // Alle Fahrten (sowohl als Fahrer als auch als Mitfahrer)
          const [driverRides, passengerBookings] = await Promise.all([
            prisma.ride.findMany({
              where: { driverId: userId },
              include: {
                bookings: {
                  select: { 
                    id: true, 
                    status: true,
                    passenger: {
                      select: { firstName: true, lastName: true }
                    }
                  }
                }
              },
              take: parseInt(limit) / 2,
              orderBy: { createdAt: 'desc' }
            }),
            prisma.booking.findMany({
              where: { passengerId: userId },
              include: {
                ride: {
                  select: {
                    id: true,
                    startLocation: true,
                    endLocation: true,
                    departureTime: true,
                    status: true,
                    driver: {
                      select: { firstName: true, lastName: true }
                    }
                  }
                }
              },
              take: parseInt(limit) / 2,
              orderBy: { createdAt: 'desc' }
            })
          ]);

          return res.status(200).json({
            success: true,
            data: {
              driverRides,
              passengerBookings
            }
          });
        }

      default:
        return res.status(405).json({ 
          success: false, 
          message: 'Method not allowed' 
        });
    }
  } catch (error) {
    console.error('Rides API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    await prisma.$disconnect();
  }
}

