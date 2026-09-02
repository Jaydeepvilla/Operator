import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { 
  staffMembers, 
  staffSchedules, 
  staffAvailability, 
  serviceAssignments 
} from "../db/schema";

export interface NewStaffMember {
  organizationId: string;
  name: string;
  role?: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  bufferTime?: number;
  isActive?: boolean;
}

export interface NewStaffSchedule {
  organizationId: string;
  staffMemberId: string;
  dayOfWeek: number;
  shifts: Array<{ start: string; end: string }>;
}

export interface NewStaffAvailabilityException {
  organizationId: string;
  staffMemberId: string;
  exceptionDate: string;
  isAvailable: boolean;
  shifts?: Array<{ start: string; end: string }> | null;
  reason?: string | null;
}

export const staffRepository = {
  async list(organizationId: string) {
    return db
      .select()
      .from(staffMembers)
      .where(eq(staffMembers.organizationId, organizationId))
      .orderBy(staffMembers.name);
  },

  async findById(id: string, organizationId?: string) {
    const conditions = organizationId
      ? and(eq(staffMembers.id, id), eq(staffMembers.organizationId, organizationId))
      : eq(staffMembers.id, id);
    const [staff] = await db
      .select()
      .from(staffMembers)
      .where(conditions);
    return staff || null;
  },

  async create(staff: NewStaffMember) {
    const [newStaff] = await db.insert(staffMembers).values(staff).returning();
    return newStaff;
  },

  async update(id: string, organizationId: string, updates: Partial<NewStaffMember>) {
    const [updated] = await db
      .update(staffMembers)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(staffMembers.id, id), eq(staffMembers.organizationId, organizationId)))
      .returning();
    return updated;
  },

  async delete(id: string, organizationId: string) {
    const [deleted] = await db
      .delete(staffMembers)
      .where(and(eq(staffMembers.id, id), eq(staffMembers.organizationId, organizationId)))
      .returning();
    return deleted;
  },

  // Schedules (Shifts)
  async getSchedules(staffMemberId: string, organizationId?: string) {
    const conditions = organizationId
      ? and(eq(staffSchedules.staffMemberId, staffMemberId), eq(staffSchedules.organizationId, organizationId))
      : eq(staffSchedules.staffMemberId, staffMemberId);
    return db
      .select()
      .from(staffSchedules)
      .where(conditions)
      .orderBy(staffSchedules.dayOfWeek);
  },

  async saveSchedule(schedule: NewStaffSchedule) {
    const [existing] = await db
      .select()
      .from(staffSchedules)
      .where(
        and(
          eq(staffSchedules.staffMemberId, schedule.staffMemberId),
          eq(staffSchedules.organizationId, schedule.organizationId),
          eq(staffSchedules.dayOfWeek, schedule.dayOfWeek)
        )
      );

    if (existing) {
      const [updated] = await db
        .update(staffSchedules)
        .set({
          shifts: schedule.shifts,
          updatedAt: new Date(),
        })
        .where(eq(staffSchedules.id, existing.id))
        .returning();
      return updated;
    } else {
      const [inserted] = await db.insert(staffSchedules).values(schedule).returning();
      return inserted;
    }
  },

  // Exceptions (Holidays/Overrides)
  async getAvailabilityExceptions(staffMemberId: string, organizationId?: string) {
    const conditions = organizationId
      ? and(eq(staffAvailability.staffMemberId, staffMemberId), eq(staffAvailability.organizationId, organizationId))
      : eq(staffAvailability.staffMemberId, staffMemberId);
    return db
      .select()
      .from(staffAvailability)
      .where(conditions)
      .orderBy(staffAvailability.exceptionDate);
  },

  async saveAvailabilityException(exception: NewStaffAvailabilityException) {
    const [existing] = await db
      .select()
      .from(staffAvailability)
      .where(
        and(
          eq(staffAvailability.staffMemberId, exception.staffMemberId),
          eq(staffAvailability.organizationId, exception.organizationId),
          eq(staffAvailability.exceptionDate, exception.exceptionDate)
        )
      );

    if (existing) {
      const [updated] = await db
        .update(staffAvailability)
        .set({
          isAvailable: exception.isAvailable,
          shifts: exception.shifts,
          reason: exception.reason,
          updatedAt: new Date(),
        })
        .where(eq(staffAvailability.id, existing.id))
        .returning();
      return updated;
    } else {
      const [inserted] = await db.insert(staffAvailability).values(exception).returning();
      return inserted;
    }
  },

  async deleteAvailabilityException(id: string, organizationId: string) {
    await db
      .delete(staffAvailability)
      .where(and(eq(staffAvailability.id, id), eq(staffAvailability.organizationId, organizationId)));
  },

  // Service Assignments
  async listAssignments(staffMemberId: string, organizationId?: string) {
    const conditions = organizationId
      ? and(eq(serviceAssignments.staffMemberId, staffMemberId), eq(serviceAssignments.organizationId, organizationId))
      : eq(serviceAssignments.staffMemberId, staffMemberId);
    return db
      .select()
      .from(serviceAssignments)
      .where(conditions);
  },

  async assignService(organizationId: string, staffMemberId: string, serviceId: string) {
    const [existing] = await db
      .select()
      .from(serviceAssignments)
      .where(
        and(
          eq(serviceAssignments.organizationId, organizationId),
          eq(serviceAssignments.staffMemberId, staffMemberId),
          eq(serviceAssignments.serviceId, serviceId)
        )
      );

    if (existing) return existing;

    const [inserted] = await db
      .insert(serviceAssignments)
      .values({ organizationId, staffMemberId, serviceId })
      .returning();
    return inserted;
  },

  async unassignService(staffMemberId: string, serviceId: string, organizationId: string) {
    await db
      .delete(serviceAssignments)
      .where(
        and(
          eq(serviceAssignments.organizationId, organizationId),
          eq(serviceAssignments.staffMemberId, staffMemberId),
          eq(serviceAssignments.serviceId, serviceId)
        )
      );
  },

  async listStaffForService(serviceId: string, organizationId?: string) {
    const conditions = organizationId
      ? and(
          eq(serviceAssignments.serviceId, serviceId),
          eq(serviceAssignments.organizationId, organizationId),
          eq(staffMembers.isActive, true)
        )
      : and(eq(serviceAssignments.serviceId, serviceId), eq(staffMembers.isActive, true));
    return db
      .select({
        staffMember: staffMembers,
      })
      .from(serviceAssignments)
      .innerJoin(staffMembers, eq(serviceAssignments.staffMemberId, staffMembers.id))
      .where(conditions);
  },

  // Organization-wide getters for Intelligence Engines
  async listAllSchedules(organizationId: string) {
    return db
      .select()
      .from(staffSchedules)
      .where(eq(staffSchedules.organizationId, organizationId));
  },

  async listAllAvailabilityExceptions(organizationId: string) {
    return db
      .select()
      .from(staffAvailability)
      .where(eq(staffAvailability.organizationId, organizationId));
  },

  async listAllAssignments(organizationId: string) {
    return db
      .select()
      .from(serviceAssignments)
      .where(eq(serviceAssignments.organizationId, organizationId));
  }
};
