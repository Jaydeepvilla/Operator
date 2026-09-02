"use client";

import { m } from "framer-motion";
import { hoverScale } from "@/components/motion/hover";
import { KPICard } from "../shared/kpi-card";
import { MetricBar } from "../shared/metric-bar";
import { Brain, BookOpen } from "lucide-react";

interface KnowledgeStatusWidgetProps {
  knowledgeScore: {
    overall: number;
    coverage: number;
    missingDocuments: number;
    suggestions: string[];
    aiConfidence: number;
  };
}

export function KnowledgeStatusWidget({
  knowledgeScore,
}: KnowledgeStatusWidgetProps) {
  const { overall, coverage, missingDocuments, suggestions, aiConfidence } =
    knowledgeScore;

  const isEmpty = overall === 0 && coverage === 0;

  // Why low explanation with correct grammar
  const whyLow =
    overall < 70
      ? missingDocuments > 0
        ? `${missingDocuments} missing topic${missingDocuments !== 1 ? "s" : ""} reduce${missingDocuments === 1 ? "s" : ""} AI accuracy`
        : "Knowledge base ready for content"
      : overall < 90
        ? "A few weak areas reduce confidence"
        : undefined;

  return (
    <KPICard
      title="AI Knowledge"
      href="/kb"
      icon={Brain}
      score={overall}
      empty={isEmpty}
      displayValue={isEmpty ? "0%" : `${overall}%`}
      statusLabel={isEmpty ? "Ready for Knowledge" : (whyLow ?? `${overall}% coverage`)}
      alertCount={missingDocuments}
      alertText="missing topic"
      alertIcon={BookOpen}
      alertType={missingDocuments > 3 ? "error" : missingDocuments > 0 ? "warning" : "success"}
      metaText={isEmpty ? "Import website or FAQs to train AI" : `AI confidence: ${aiConfidence}%`}
    >
      <div className="space-y-space-2">
        <MetricBar
          label="Coverage"
          value={coverage}
          empty={isEmpty}
          displayValue={isEmpty ? "0%" : undefined}
          showDot
        />
        <MetricBar
          label="AI Confidence"
          value={aiConfidence}
          empty={isEmpty}
          displayValue={isEmpty ? "Calibrating" : undefined}
          showDot
        />
      </div>
    </KPICard>
  );
}
