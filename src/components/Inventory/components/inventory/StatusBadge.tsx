import { Badge } from "@/components/Inventory/components/ui/badge";
import { cva, type VariantProps } from "class-variance-authority";

const statusVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      status: {
        pending: "bg-status-pending text-status-pending-foreground",
        processing: "bg-status-processing text-status-processing-foreground",
        completed: "bg-status-completed text-status-completed-foreground",
        cancelled: "bg-status-cancelled text-status-cancelled-foreground",
        paid: "bg-status-paid text-status-paid-foreground",
        unpaid: "bg-status-unpaid text-status-unpaid-foreground",
        awaiting: "bg-status-pending text-status-pending-foreground",
        assigned: "bg-status-processing text-status-processing-foreground",
        dispatched: "bg-status-completed text-status-completed-foreground",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
);

interface StatusBadgeProps extends VariantProps<typeof statusVariants> {
  children: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  return (
    <Badge className={statusVariants({ status })}>
      {children}
    </Badge>
  );
}