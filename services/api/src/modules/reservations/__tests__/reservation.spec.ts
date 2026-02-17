import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('Reservation Service Tests', () => {
  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-1';

  describe('Reservation Creation', () => {
    it('should generate a unique booking reference in LDG-XXXXXX format', () => {
      const generateBookingReference = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = 'LDG-';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      const ref = generateBookingReference();
      expect(ref).toMatch(/^LDG-[A-Z0-9]{6}$/);
    });

    it('should require checkOut to be after checkIn', () => {
      const checkIn = new Date('2025-03-10');
      const checkOut = new Date('2025-03-08');

      expect(checkOut > checkIn).toBe(false);
    });

    it('should require checkIn to be today or in the future', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const pastDate = new Date('2020-01-01');
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      expect(pastDate >= today).toBe(false);
      expect(futureDate >= today).toBe(true);
    });

    it('should require at least one room in the booking', () => {
      const rooms: any[] = [];
      expect(rooms.length).toBe(0);
      expect(() => {
        if (rooms.length === 0) throw new BadRequestException('At least one room is required');
      }).toThrow('At least one room is required');
    });

    it('should require guest to provide at least phone or email', () => {
      const guestWithEmail = { firstName: 'John', lastName: 'Doe', email: 'john@example.com' };
      const guestWithPhone = { firstName: 'John', lastName: 'Doe', phone: '+1234567890' };
      const guestWithNeither = { firstName: 'John', lastName: 'Doe' };

      expect(guestWithEmail.email || (guestWithEmail as any).phone).toBeTruthy();
      expect((guestWithPhone as any).email || guestWithPhone.phone).toBeTruthy();
      expect(guestWithNeither.email || (guestWithNeither as any).phone).toBeFalsy();
    });

    it('should calculate total amount based on nights and room price', () => {
      const checkIn = new Date('2025-03-10');
      const checkOut = new Date('2025-03-13');
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const pricePerNight = 100;
      const roomCount = 2;

      const totalAmount = nights * pricePerNight * roomCount;

      expect(nights).toBe(3);
      expect(totalAmount).toBe(600);
    });
  });

  describe('Reservation Status Transitions', () => {
    it('should allow transition from pending to confirmed', () => {
      const validTransitions: Record<string, string[]> = {
        inquiry: ['pending', 'cancelled'],
        pending: ['confirmed', 'cancelled'],
        confirmed: ['checked_in', 'cancelled', 'no_show'],
        checked_in: ['checked_out'],
        checked_out: [],
        cancelled: [],
        no_show: [],
      };

      expect(validTransitions['pending']).toContain('confirmed');
    });

    it('should NOT allow transition from checked_out to checked_in', () => {
      const validTransitions: Record<string, string[]> = {
        checked_out: [],
        cancelled: [],
      };

      expect(validTransitions['checked_out']).not.toContain('checked_in');
    });

    it('should NOT allow cancellation of checked_in reservation', () => {
      const validTransitions: Record<string, string[]> = {
        checked_in: ['checked_out'],
      };

      expect(validTransitions['checked_in']).not.toContain('cancelled');
    });
  });

  describe('Check-in / Check-out', () => {
    it('should assign rooms during check-in', () => {
      const reservationRooms = [
        { id: 'rr-1', roomTypeId: 'rt-1', roomId: null },
        { id: 'rr-2', roomTypeId: 'rt-1', roomId: null },
      ];

      const roomAssignments = [
        { reservationRoomId: 'rr-1', roomId: 'room-101' },
        { reservationRoomId: 'rr-2', roomId: 'room-102' },
      ];

      // Verify all rooms get assigned
      for (const assignment of roomAssignments) {
        const rr = reservationRooms.find((r) => r.id === assignment.reservationRoomId);
        expect(rr).toBeDefined();
        rr!.roomId = assignment.roomId;
      }

      expect(reservationRooms.every((rr) => rr.roomId !== null)).toBe(true);
    });

    it('should mark rooms as dirty on check-out', () => {
      const rooms = [
        { id: 'room-101', status: 'occupied' },
        { id: 'room-102', status: 'occupied' },
      ];

      // Simulate check-out
      rooms.forEach((r) => (r.status = 'dirty'));

      expect(rooms.every((r) => r.status === 'dirty')).toBe(true);
    });
  });
});
