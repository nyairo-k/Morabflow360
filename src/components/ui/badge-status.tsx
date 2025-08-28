import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Pending Approval':
        return 'bg-status-pending text-status-pending-foreground border-status-pending/20';
      case 'Approved':
        return 'bg-status-approved text-status-approved-foreground border-status-approved/20';
      case 'Paid':
        return 'bg-status-paid text-status-paid-foreground border-status-paid/20';
      case 'Awaiting Receipt':
        return 'bg-status-verified text-status-verified-foreground border-status-verified/20';
      case 'Completed':
        return 'bg-status-completed text-status-completed-foreground border-status-completed/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(getStatusStyles(status), className)}
    >
      {status}
    </Badge>
  );
}