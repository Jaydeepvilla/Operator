export interface StageTimings {
  t_webhook_arrival: number;
  t_signature_verified?: number;
  t_tenant_resolved?: number;
  t_profile_resolved?: number;
  t_action_executed?: number;
  t_delivery_sent?: number;
  t_total_ms?: number;
}

export interface LatencySample {
  organizationId: string;
  actionId?: string;
  isAiFallback: boolean;
  stageTimings: StageTimings;
  totalDurationMs: number;
  timestamp: number;
}

const MAX_SAMPLES = 500;
const latencySamples: LatencySample[] = [];

export const whatsAppMetricsService = {
  recordSample(sample: LatencySample) {
    if (latencySamples.length >= MAX_SAMPLES) {
      latencySamples.shift();
    }
    latencySamples.push(sample);
  },

  getStats(organizationId?: string): {
    totalSamples: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    avgWebhookAckMs: number;
    avgActionMs: number;
    avgDeliveryMs: number;
  } {
    const filtered = organizationId
      ? latencySamples.filter((s) => s.organizationId === organizationId)
      : latencySamples;

    if (filtered.length === 0) {
      return {
        totalSamples: 0,
        p50Ms: 0,
        p95Ms: 0,
        p99Ms: 0,
        avgWebhookAckMs: 0,
        avgActionMs: 0,
        avgDeliveryMs: 0,
      };
    }

    const sorted = [...filtered].map((s) => s.totalDurationMs).sort((a, b) => a - b);
    const p50Index = Math.floor(sorted.length * 0.5);
    const p95Index = Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1);
    const p99Index = Math.min(Math.floor(sorted.length * 0.99), sorted.length - 1);

    const avgAck =
      filtered.reduce((sum, s) => {
        const ack = (s.stageTimings.t_signature_verified || s.stageTimings.t_webhook_arrival) - s.stageTimings.t_webhook_arrival;
        return sum + Math.max(0, ack);
      }, 0) / filtered.length;

    const avgAction =
      filtered.reduce((sum, s) => {
        const action = (s.stageTimings.t_action_executed || s.stageTimings.t_webhook_arrival) - (s.stageTimings.t_profile_resolved || s.stageTimings.t_webhook_arrival);
        return sum + Math.max(0, action);
      }, 0) / filtered.length;

    const avgDelivery =
      filtered.reduce((sum, s) => {
        const del = (s.stageTimings.t_delivery_sent || s.stageTimings.t_webhook_arrival) - (s.stageTimings.t_action_executed || s.stageTimings.t_webhook_arrival);
        return sum + Math.max(0, del);
      }, 0) / filtered.length;

    return {
      totalSamples: sorted.length,
      p50Ms: Math.round(sorted[p50Index] || 0),
      p95Ms: Math.round(sorted[p95Index] || 0),
      p99Ms: Math.round(sorted[p99Index] || 0),
      avgWebhookAckMs: Math.round(avgAck),
      avgActionMs: Math.round(avgAction),
      avgDeliveryMs: Math.round(avgDelivery),
    };
  },
};
