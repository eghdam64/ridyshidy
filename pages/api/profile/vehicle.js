// pages/api/profile/vehicle.js
// Fahrzeugverwaltung API

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
        // Alle Fahrzeuge des Benutzers abrufen
        const vehicles = await prisma.vehicle.findMany({
          where: { 
            ownerId: userId,
            isActive: true 
          },
          orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json({
          success: true,
          data: vehicles
        });

      case 'POST':
        // Neues Fahrzeug hinzufügen
        const { 
          make, 
          model, 
          year, 
          color, 
          licensePlate, 
          seats,
          vehicleType 
        } = req.body;

        // Validierung
        if (!make || !model || !year || !licensePlate) {
          return res.status(400).json({
            success: false,
            message: 'Marke, Modell, Jahr und Kennzeichen sind erforderlich'
          });
        }

        if (year < 1900 || year > new Date().getFullYear() + 1) {
          return res.status(400).json({
            success: false,
            message: 'Ungültiges Baujahr'
          });
        }

        // Prüfen ob Kennzeichen bereits existiert
        const existingVehicle = await prisma.vehicle.findFirst({
          where: { licensePlate: licensePlate.toUpperCase() }
        });

        if (existingVehicle) {
          return res.status(400).json({
            success: false,
            message: 'Fahrzeug mit diesem Kennzeichen bereits registriert'
          });
        }

        const newVehicle = await prisma.vehicle.create({
          data: {
            ownerId: userId,
            make: make.trim(),
            model: model.trim(),
            year: parseInt(year),
            color: color?.trim() || null,
            licensePlate: licensePlate.toUpperCase().trim(),
            seats: seats ? parseInt(seats) : 4,
            vehicleType: vehicleType || 'CAR'
          }
        });

        return res.status(201).json({
          success: true,
          message: 'Fahrzeug erfolgreich hinzugefügt',
          data: newVehicle
        });

      case 'PUT':
        // Fahrzeug aktualisieren
        const { vehicleId, ...updateData } = req.body;

        if (!vehicleId) {
          return res.status(400).json({
            success: false,
            message: 'Fahrzeug-ID erforderlich'
          });
        }

        // Prüfen ob Fahrzeug dem Benutzer gehört
        const vehicleToUpdate = await prisma.vehicle.findFirst({
          where: { 
            id: vehicleId,
            ownerId: userId 
          }
        });

        if (!vehicleToUpdate) {
          return res.status(404).json({
            success: false,
            message: 'Fahrzeug nicht gefunden'
          });
        }

        const updatedVehicle = await prisma.vehicle.update({
          where: { id: vehicleId },
          data: {
            ...updateData,
            updatedAt: new Date()
          }
        });

        return res.status(200).json({
          success: true,
          message: 'Fahrzeug erfolgreich aktualisiert',
          data: updatedVehicle
        });

      case 'DELETE':
        // Fahrzeug löschen (soft delete)
        const { vehicleId: deleteId } = req.query;

        if (!deleteId) {
          return res.status(400).json({
            success: false,
            message: 'Fahrzeug-ID erforderlich'
          });
        }

        const vehicleToDelete = await prisma.vehicle.findFirst({
          where: { 
            id: deleteId,
            ownerId: userId 
          }
        });

        if (!vehicleToDelete) {
          return res.status(404).json({
            success: false,
            message: 'Fahrzeug nicht gefunden'
          });
        }

        // Soft delete
        await prisma.vehicle.update({
          where: { id: deleteId },
          data: { 
            isActive: false,
            updatedAt: new Date()
          }
        });

        return res.status(200).json({
          success: true,
          message: 'Fahrzeug erfolgreich entfernt'
        });

      default:
        return res.status(405).json({ 
          success: false, 
          message: 'Method not allowed' 
        });
    }
  } catch (error) {
    console.error('Vehicle API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    await prisma.$disconnect();
  }
}

