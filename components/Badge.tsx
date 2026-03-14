import { IMPORTANCE_COLOR, STATUS_COLOR } from "@/lib/types";
import type { Importance, CatalystStatus } from "@/lib/types";

export function ImportanceBadge({ value }: { value: Importance }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${IMPORTANCE_COLOR[value]}`}>
      {value}
    </span>
  );
}

export function StatusBadge({ value }: { value: CatalystStatus }) {
  const labels = { pending: "待機中", realized: "顕在化済", expired: "消滅" };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[value]}`}>
      {labels[value]}
    </span>
  );
}
