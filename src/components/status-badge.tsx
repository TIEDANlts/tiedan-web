import { Badge } from "@/components/ui/badge";
import { getStatusColor, type StatusColor } from "@/lib/design";

type StatusBadgeProps = {
  value: string;
  map?: Record<string, StatusColor>;
};

export function StatusBadge({ value, map }: StatusBadgeProps) {
  const status = getStatusColor(value, map);

  return (
    <Badge
      variant="outline"
      style={{
        borderColor: status.color,
        color: status.color,
        backgroundColor: `color-mix(in srgb, ${status.color} 12%, transparent)`,
      }}
    >
      {status.label}
    </Badge>
  );
}
