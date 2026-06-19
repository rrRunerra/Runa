import React from "react";
import StatsDashboard from "@/components/aquila/stats/StatsDashboard";

interface StatsTabProps {
  name: string;
}

export default function StatsTab({ name }: StatsTabProps) {
  return <StatsDashboard username={name} />;
}
