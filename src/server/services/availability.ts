import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { services, businessSettings } from "../db/schema";
import { staffRepository } from "../repositories/staff";
import { appointmentsRepository } from "../repositories/appointments";
import { calendarRepository } from "../repositories/calendar";
import { rulesRepository } from "../repositories/rules";
import { providerRegistry } from "./calendar-provider";

export interface TimeSlot {
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  staffId: string;
  staffMemberId?: string;
  staffName: string;
}

export const availabilityService = {
  async getAvailableSlots(
    organizationId: string,
    serviceId: string,
    dateStr: string, // YYYY-MM-DD
    staffMemberId?: string
  ): Promise<TimeSlot[]> {
    try {
      const slots: TimeSlot[] = [];

      // 1. Fetch Service details
      let service: any = null;
      try {
        const servicesList = await db
          .select()
          .from(services)
          .where(and(eq(services.id, serviceId), eq(services.organizationId, organizationId)));
        service = servicesList[0];
      } catch (e: any) {
        console.warn("[Availability] DB fallback for service:", e.message);
      }

      const duration = service?.duration || 30;

      // 1.5 Check Holidays
      let settings: any = null;
      try {
        const settingsList = await db
          .select()
          .from(businessSettings)
          .where(eq(businessSettings.organizationId, organizationId));
        settings = settingsList[0];
      } catch (e) {
        // Fallback
      }
      
      if (settings?.holidays?.includes(dateStr)) {
        return []; // Closed on holidays
      }

      // 2. Fetch Booking Rules (min lead time, buffers)
      let rules: any = null;
      try {
        rules = await rulesRepository.getByOrganization(organizationId);
      } catch (e) {
        // Fallback
      }
      const minLeadTime = rules?.minLeadTime ?? 2; // hours
      const bufferBefore = rules?.defaultBufferBefore ?? 0;
      const bufferAfter = rules?.defaultBufferAfter ?? 0;

      // 3. Resolve eligible staff members with multi-tier fallback
      let eligibleStaff: any[] = [];
      try {
        if (staffMemberId) {
          const staff = await staffRepository.findById(staffMemberId);
          if (staff && staff.isActive) eligibleStaff = [staff];
        }
        if (eligibleStaff.length === 0) {
          const assignments = await staffRepository.listStaffForService(serviceId, organizationId);
          eligibleStaff = assignments.map((a) => a.staffMember).filter((s) => s && s.isActive);
        }
        if (eligibleStaff.length === 0) {
          const allStaff = await staffRepository.list(organizationId);
          eligibleStaff = allStaff.filter((s) => s.isActive);
        }
        if (eligibleStaff.length === 0) {
          const defaultStaff = await staffRepository.create({
            organizationId,
            name: "General Specialist",
            role: "Front Desk & Service Team",
            isActive: true,
          });
          eligibleStaff = [defaultStaff];
        }
      } catch (e) {
        // Fallback
      }

      if (eligibleStaff.length === 0) {
        return [];
      }

      // Parse target date context
      const [year, month, day] = dateStr.split("-").map(Number);
      const targetDate = new Date(year, month - 1, day);
      const dayOfWeek = targetDate.getDay(); // 0 (Sunday) to 6 (Saturday)
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const currentDayName = dayNames[dayOfWeek];

      // Check rules: min lead time
      const now = new Date();
      const minAllowedTime = new Date(now.getTime() + minLeadTime * 60 * 60 * 1000);

      // Fetch existing appointments for the day
      let dayAppointments: any[] = [];
      try {
        const dayStart = new Date(year, month - 1, day, 0, 0, 0);
        const dayEnd = new Date(year, month - 1, day, 23, 59, 59);
        dayAppointments = await appointmentsRepository.list(organizationId, {
          startDate: dayStart,
          endDate: dayEnd,
        });
      } catch (e) {
        // Fallback
      }

      for (const staff of eligibleStaff) {
        // 4. Resolve shifts for the target date
        let shifts: Array<{ start: string; end: string }> = [];

        try {
          const exceptions = await staffRepository.getAvailabilityExceptions(staff.id);
          const dayException = exceptions.find((e) => e.exceptionDate === dateStr);

          if (dayException) {
            if (!dayException.isAvailable) {
              continue;
            }
            shifts = (dayException.shifts as Array<{ start: string; end: string }>) || [];
          } else {
            const schedules = await staffRepository.getSchedules(staff.id);
            const daySchedule = schedules.find((s) => s.dayOfWeek === dayOfWeek);
            if (daySchedule && Array.isArray(daySchedule.shifts) && daySchedule.shifts.length > 0) {
              shifts = daySchedule.shifts as Array<{ start: string; end: string }>;
            }
          }
        } catch (e) {
          // Fallback
        }

        // If no staff-specific shifts are defined, check organization business hours
        if (shifts.length === 0) {
          const bHours = settings?.businessHours?.[currentDayName];
          if (bHours && !bHours.closed && bHours.open && bHours.close) {
            shifts = [{ start: bHours.open, end: bHours.close }];
          } else if (!bHours && dayOfWeek !== 0 && dayOfWeek !== 6) {
            // Default 9am-5pm for weekdays
            shifts = [{ start: "09:00", end: "17:00" }];
          } else if (bHours?.closed) {
            continue; // Business explicitly closed this day
          }
        }

        if (shifts.length === 0) continue;

        let externalBusyPeriods: Array<{ start: Date; end: Date }> = [];
        try {
          const connections = await calendarRepository.listConnections(organizationId);
          const staffConn = connections.find((c) => c.staffMemberId === staff.id && c.syncStatus === "active");
          if (staffConn) {
            const provider = providerRegistry.getProvider(staffConn.provider);
            const dayStart = new Date(year, month - 1, day, 0, 0, 0);
            const dayEnd = new Date(year, month - 1, day, 23, 59, 59);
            const busyList = await provider.getBusyPeriods(
              staffConn.accessToken,
              staffConn.refreshToken,
              staffConn.expiresAt,
              staffConn.externalCalendarId,
              dayStart,
              dayEnd
            );
            externalBusyPeriods = busyList.map((b) => ({ start: b.start, end: b.end }));
          }
        } catch (e) {
          // Fallback
        }

        // Generate time slots
        for (const shift of shifts) {
          const [startH, startM] = shift.start.split(":").map(Number);
          const [endH, endM] = shift.end.split(":").map(Number);

          const shiftStartMin = startH * 60 + startM;
          const shiftEndMin = endH * 60 + endM;

          for (let time = shiftStartMin; time + duration <= shiftEndMin; time += 30) {
            const slotStartH = Math.floor(time / 60);
            const slotStartM = time % 60;
            const slotEndH = Math.floor((time + duration) / 60);
            const slotEndM = (time + duration) % 60;

            const startTimeStr = `${slotStartH.toString().padStart(2, "0")}:${slotStartM.toString().padStart(2, "0")}`;
            const endTimeStr = `${slotEndH.toString().padStart(2, "0")}:${slotEndM.toString().padStart(2, "0")}`;

            const slotStart = new Date(year, month - 1, day, slotStartH, slotStartM - bufferBefore);
            const slotEnd = new Date(year, month - 1, day, slotEndH, slotEndM + bufferAfter);

            if (slotStart < minAllowedTime) continue;

            let hasConflict = false;
            for (const appt of dayAppointments) {
              if (appt.staffMemberId === staff.id && appt.status !== "cancelled") {
                const apptStart = new Date(appt.startTime);
                const apptEnd = new Date(appt.endTime);
                if (slotStart < apptEnd && slotEnd > apptStart) {
                  hasConflict = true;
                  break;
                }
              }
            }

            for (const busy of externalBusyPeriods) {
              if (slotStart < busy.end && slotEnd > busy.start) {
                hasConflict = true;
                break;
              }
            }

            if (hasConflict) continue;

            slots.push({
              startTime: startTimeStr,
              endTime: endTimeStr,
              staffId: staff.id,
              staffMemberId: staff.id,
              staffName: staff.name,
            });
          }
        }
      }

      return slots;
    } catch (err: any) {
      console.warn("[Availability] Error retrieving availability slots:", err.message);
      return [];
    }
  },
};
