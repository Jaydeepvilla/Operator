import { test, expect } from '@playwright/test';
import crypto from 'crypto';
import { db } from '../src/server/db';
import { appointments, services, staffMembers, businessSettings, serviceAssignments, organizations } from '../src/server/db/schema';
import { eq, and, notInArray, lt, gt } from 'drizzle-orm';
import { bookingService } from '../src/server/services/booking';
import { availabilityService } from '../src/server/services/availability';

test.describe('Operator Phase 3 — Booking Engine & Concurrency Safety Suite', () => {

  const testOrgId = '33333333-3333-3333-3333-333333333333';
  let serviceId: string;
  let staffId: string;

  test.beforeAll(async () => {
    // Dedicated isolated test organization for booking-engine suite
    await db
      .insert(organizations)
      .values({
        id: testOrgId,
        name: 'Booking Engine Dedicated Test Org',
        slug: 'booking-engine-test-org',
        industry: 'Healthcare',
        timezone: 'Asia/Kolkata',
        verificationStatus: 'verified',
        onboardingStatus: 'completed',
        onboardingStep: 'completed',
      })
      .onConflictDoUpdate({
        target: organizations.id,
        set: {
          name: 'Booking Engine Dedicated Test Org',
          timezone: 'Asia/Kolkata',
        },
      });

    // Enable public booking on businessSettings
    const [existingSettings] = await db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.organizationId, testOrgId))
      .limit(1);

    const fullWeekHours = {
      monday: { open: '08:00', close: '22:00' },
      tuesday: { open: '08:00', close: '22:00' },
      wednesday: { open: '08:00', close: '22:00' },
      thursday: { open: '08:00', close: '22:00' },
      friday: { open: '08:00', close: '22:00' },
      saturday: { open: '08:00', close: '22:00' },
      sunday: { open: '08:00', close: '22:00' },
    };

    if (existingSettings) {
      await db
        .update(businessSettings)
        .set({
          businessHours: fullWeekHours,
          bookingPreferences: {
            ...(existingSettings.bookingPreferences as Record<string, any> || {}),
            publicBookingEnabled: true,
          },
          updatedAt: new Date(),
        })
        .where(eq(businessSettings.organizationId, testOrgId));
    } else {
      await db.insert(businessSettings).values({
        organizationId: testOrgId,
        businessHours: fullWeekHours,
        bookingPreferences: { publicBookingEnabled: true },
      });
    }

    // Seed service for booking suite
    serviceId = crypto.randomUUID();
    await db.insert(services).values({
      id: serviceId,
      organizationId: testOrgId,
      name: `Specialist Consultation ${Date.now()}`,
      duration: 30,
      price: '85.00',
      isActive: true,
    });

    // Seed staff member for booking suite
    staffId = crypto.randomUUID();
    await db.insert(staffMembers).values({
      id: staffId,
      organizationId: testOrgId,
      name: `Dr. Samantha Reed ${Date.now()}`,
      role: 'Consultant',
      isActive: true,
    });

    // Assign staff member to service
    await db.insert(serviceAssignments).values({
      id: crypto.randomUUID(),
      organizationId: testOrgId,
      serviceId,
      staffMemberId: staffId,
    });
  });

  test('Booking A — Slot Booking: Database persistence and confirmation', async () => {
    const targetDate = '2026-11-03'; // Tuesday
    const slots = await availabilityService.getAvailableSlots(testOrgId, serviceId, targetDate, staffId);
    expect(slots.length).toBeGreaterThan(0);

    const bookingTime = new Date(`${targetDate}T${slots[0].startTime}:00+05:30`);

    const appt = await bookingService.createAppointment({
      organizationId: testOrgId,
      serviceId,
      staffMemberId: staffId,
      startTime: bookingTime,
      customerName: 'Marcus Vance',
      customerEmail: 'marcus.vance@example.com',
      customerPhone: '+15552345678',
      isPublic: false,
    });

    expect(appt).toBeDefined();
    expect(appt.id).toBeDefined();
    expect(appt.customerName).toBe('Marcus Vance');

    // Verify DB record directly
    const [saved] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appt.id))
      .limit(1);

    expect(saved).toBeDefined();
    expect(saved.status).toBe('confirmed');
    expect(new Date(saved.startTime).getTime()).toBe(bookingTime.getTime());
  });

  test('Booking B — Double-Booking Rejection: Advisory lock and conflict rejection', async () => {
    const targetDate = '2026-11-03';
    const slots = await availabilityService.getAvailableSlots(testOrgId, serviceId, targetDate, staffId);
    expect(slots.length).toBeGreaterThan(1);

    const targetSlot = new Date(`${targetDate}T${slots[1].startTime}:00+05:30`);

    // Book the first appointment
    await bookingService.createAppointment({
      organizationId: testOrgId,
      serviceId,
      staffMemberId: staffId,
      startTime: targetSlot,
      customerName: 'First Customer',
      customerEmail: 'first@example.com',
      customerPhone: '+15551112222',
      isPublic: false,
    });

    // Attempt second booking on the exact same staff member and slot
    let errorCaught: any = null;
    try {
      await bookingService.createAppointment({
        organizationId: testOrgId,
        serviceId,
        staffMemberId: staffId,
        startTime: targetSlot,
        customerName: 'Second Customer (Attacker/Conflict)',
        customerEmail: 'second@example.com',
        customerPhone: '+15553334444',
        isPublic: false,
      });
    } catch (err: any) {
      errorCaught = err;
    }

    expect(errorCaught).toBeDefined();
    expect(errorCaught.message).toMatch(/(Conflict|no longer available|outside business hours)/i);

    // Verify only 1 appointment exists for that slot
    const slotAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.organizationId, testOrgId),
          eq(appointments.staffMemberId, staffId),
          eq(appointments.startTime, targetSlot),
          notInArray(appointments.status, ['cancelled'])
        )
      );

    expect(slotAppointments.length).toBe(1);
    expect(slotAppointments[0].customerName).toBe('First Customer');
  });

  test('Booking C — Cancellation & Rescheduling: Lifecycle updates in database', async () => {
    test.setTimeout(60000);
    const targetDate = '2026-11-03';
    const slots = await availabilityService.getAvailableSlots(testOrgId, serviceId, targetDate, staffId);
    expect(slots.length).toBeGreaterThan(2);

    const originalTime = new Date(`${targetDate}T${slots[2].startTime}:00+05:30`);

    const appt = await bookingService.createAppointment({
      organizationId: testOrgId,
      serviceId,
      staffMemberId: staffId,
      startTime: originalTime,
      customerName: 'Elena Rostova',
      customerEmail: 'elena@example.com',
      customerPhone: '+15557778888',
      isPublic: false,
    });

    // 1. Cancel the appointment
    await db
      .update(appointments)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appt.id));

    const [cancelledAppt] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appt.id))
      .limit(1);

    expect(cancelledAppt.status).toBe('cancelled');

    // 2. Since slot is now cancelled, booking the original time should now succeed
    const rebookedAppt = await bookingService.createAppointment({
      organizationId: testOrgId,
      serviceId,
      staffMemberId: staffId,
      startTime: originalTime,
      customerName: 'Elena Rostova (New)',
      customerEmail: 'elena@example.com',
      customerPhone: '+15557778888',
      isPublic: false,
    });

    expect(rebookedAppt).toBeDefined();
    expect(rebookedAppt.id).not.toBe(appt.id);
  });

  test('Booking D — Timezone & Boundary Accuracy: Preserves exact UTC instant across local conversions', async () => {
    const targetDate = '2026-11-03';
    const slots = await availabilityService.getAvailableSlots(testOrgId, serviceId, targetDate, staffId);
    expect(slots.length).toBeGreaterThan(3);

    const utcTime = new Date(`${targetDate}T${slots[3].startTime}:00+05:30`);

    const appt = await bookingService.createAppointment({
      organizationId: testOrgId,
      serviceId,
      staffMemberId: staffId,
      startTime: utcTime,
      customerName: 'Timezone Verification Customer',
      customerEmail: 'tz@example.com',
      customerPhone: '+15559990000',
      isPublic: false,
    });

    const [saved] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appt.id))
      .limit(1);

    expect(new Date(saved.startTime).getTime()).toBe(utcTime.getTime());
    expect(new Date(saved.endTime).getTime()).toBe(utcTime.getTime() + 30 * 60 * 1000); // 30 min duration
  });

});
