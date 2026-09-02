import { conversationsRepository } from "@/server/repositories/conversations";
import { appointmentsRepository } from "@/server/repositories/appointments";
import { escalationsRepository } from "@/server/repositories/escalations";

export type TimeRange = "today" | "7d" | "30d" | "all";

export interface DailyBriefData {
  range: TimeRange;
  conversationsHandled: number;
  appointmentsBooked: number;
  appointmentsCancelled: number;
  appointmentsNoShow: number;
  escalations: number;
  missedOpportunities: number;
  estimatedTimeSavedMinutes: number;
  revenueGenerated: number;
  aiSuccessRate: number;
  conversionRate: number;
  hasConversations: boolean;
  hasAppointments: boolean;
  date: string;
}

function getRangeStartDate(range: TimeRange = "today"): Date {
  const now = new Date();
  if (range === "7d") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (range === "30d") {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  if (range === "all") {
    return new Date(0);
  }
  // Default: start of today in local time
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function getDailyBrief(
  organizationId: string,
  range: TimeRange = "today"
): Promise<DailyBriefData> {
  const startDate = getRangeStartDate(range);
  const now = new Date();

  let allConversations: any[] = [];
  let allAppointments: any[] = [];
  let allEscalations: any[] = [];

  try {
    const results = await Promise.allSettled([
      conversationsRepository.list(organizationId),
      appointmentsRepository.list(organizationId, {
        startDate,
        endDate: now,
      }),
      escalationsRepository.list(organizationId),
    ]);

    if (results[0].status === "fulfilled") allConversations = results[0].value || [];
    if (results[1].status === "fulfilled") allAppointments = results[1].value || [];
    if (results[2].status === "fulfilled") allEscalations = results[2].value || [];
  } catch (err) {
    console.warn("Daily brief DB fallback:", err);
  }

  // Filter conversations to range
  const filteredConversations = allConversations.filter(
    (c) => new Date(c.createdAt) >= startDate
  );

  // Filter escalations to range
  const filteredEscalations = allEscalations.filter(
    (e) => new Date(e.createdAt) >= startDate
  );

  const conversationsHandled = filteredConversations.length;
  const escalations = filteredEscalations.length;

  // Appointments metrics from joined results
  const rangeAppointments = allAppointments;
  const appointmentsBooked = rangeAppointments.filter(
    (a) => a.appointment?.status === "confirmed" || a.appointment?.status === "completed"
  ).length;
  const appointmentsCancelled = rangeAppointments.filter(
    (a) => a.appointment?.status === "cancelled"
  ).length;
  const appointmentsNoShow = rangeAppointments.filter(
    (a) => a.appointment?.status === "no_show"
  ).length;

  // Revenue: sum pricePaid from confirmed/completed appointments
  const revenueGenerated = rangeAppointments.reduce((sum, a) => {
    if (
      (a.appointment?.status === "confirmed" || a.appointment?.status === "completed") &&
      a.appointment?.pricePaid
    ) {
      return sum + parseFloat(a.appointment.pricePaid);
    }
    return sum;
  }, 0);

  // Time saved: avg 3.2 minutes per AI-handled conversation (industry benchmark)
  const aiHandled = Math.max(0, conversationsHandled - escalations);
  const estimatedTimeSavedMinutes = Math.round(aiHandled * 3.2);

  // AI success rate: conversations resolved without escalation
  // Honest evaluation: if 0 conversations, success rate is 0 with hasConversations: false
  const hasConversations = conversationsHandled > 0;
  const aiSuccessRate = hasConversations
    ? Math.round(((conversationsHandled - escalations) / conversationsHandled) * 100)
    : 0;

  // Booking conversion rate: bookings / total attempts
  const totalAttempts = appointmentsBooked + appointmentsCancelled + appointmentsNoShow;
  const hasAppointments = totalAttempts > 0;
  const conversionRate = hasAppointments
    ? Math.round((appointmentsBooked / totalAttempts) * 100)
    : 0;

  // Missed opportunities: escalations + cancelled + no-shows
  const missedOpportunities = escalations + appointmentsCancelled + appointmentsNoShow;

  return {
    range,
    conversationsHandled,
    appointmentsBooked,
    appointmentsCancelled,
    appointmentsNoShow,
    escalations,
    missedOpportunities,
    estimatedTimeSavedMinutes,
    revenueGenerated,
    aiSuccessRate,
    conversionRate,
    hasConversations,
    hasAppointments,
    date: new Date().toISOString(),
  };
}
