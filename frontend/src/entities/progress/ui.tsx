import { CheckCircle2, Circle, Clock3 } from "lucide-react";
import type { TopicStatus } from "./model";

const states = {
  "not-started": { label: "Не начата", icon: Circle },
  "in-progress": { label: "В процессе", icon: Clock3 },
  completed: { label: "Завершена", icon: CheckCircle2 },
};

export function TopicStatusBadge({
  status,
  icon = true,
}: {
  status: TopicStatus;
  icon?: boolean;
}) {
  const state = states[status];
  const Icon = state.icon;
  return (
    <span className="topic-status" data-status={status}>
      {icon && <Icon size={13} aria-hidden="true" />}
      {state.label}
    </span>
  );
}

export function TopicStatusLegend() {
  return (
    <div className="topic-status-legend" aria-label="Состояния тем">
      <TopicStatusBadge status="not-started" />
      <TopicStatusBadge status="in-progress" />
      <TopicStatusBadge status="completed" />
    </div>
  );
}
