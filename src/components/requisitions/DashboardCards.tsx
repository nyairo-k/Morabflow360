import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, DollarSign, FileText, Package, AlertCircle } from "lucide-react";
import { Requisition, User } from "@/types/requisition";
import { cn } from "@/lib/utils";

interface DashboardCardsProps {
  requisitions: Requisition[];
  currentUser: User;
}

export function DashboardCards({ requisitions, currentUser }: DashboardCardsProps) {
const getMetrics = () => {
    const pending = requisitions.filter(r => r.approvalStatus === 'Pending Approval').length;
    const approved = requisitions.filter(r => r.approvalStatus === 'Approved' && r.paymentStatus === 'Unpaid').length;
    const paid = requisitions.filter(r => r.paymentStatus === 'Paid').length;
    const awaitingReceipt = requisitions.filter(r => r.paymentStatus === 'Paid').length; // This is the same as 'Paid' for InventoryStaff to action
    const completed = requisitions.filter(r => r.paymentStatus === 'Received').length;
    const totalValue = requisitions.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);

    return { pending, approved, paid, awaitingReceipt, completed, totalValue };
  };
  

  const metrics = getMetrics();

  const cards = [
    {
      title: "Pending Approval",
      value: metrics.pending,
      icon: Clock,
      bgColor: "bg-card",
      iconColor: "text-status-pending",
      show: true
    },
    {
      title: "Approved",
      value: metrics.approved,
      icon: CheckCircle,
      bgColor: "bg-card",
      iconColor: "text-status-approved",
      show: true
    },
    {
      title: "Paid",
      value: metrics.paid,
      icon: DollarSign,
      bgColor: "bg-card",
      iconColor: "text-status-paid",
      show: true
    },
    {
      title: "Awaiting Receipt",
      value: metrics.awaitingReceipt,
      icon: Package,
      bgColor: "bg-card",
      iconColor: "text-status-verified",
      show: currentUser.role === 'InventoryStaff'
    },
    {
      title: "Completed",
      value: metrics.completed,
      icon: FileText,
      bgColor: "bg-card",
      iconColor: "text-status-completed",
      show: true
    },
    {
      title: "Total Value",
      value: `Ksh ${metrics.totalValue.toLocaleString()}`,
      icon: AlertCircle,
      bgColor: "bg-card",
      iconColor: "text-primary",
      show: currentUser.role === 'Admin' || currentUser.role === 'Disbursements'
    }
  ];

  const visibleCards = cards.filter(card => card.show);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
      {visibleCards.map((card, index) => (
        <Card key={index} className={cn("border shadow-sm hover:shadow-md transition-shadow duration-200", card.bgColor)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{card.title}</p>
                <p className="text-lg font-bold text-foreground mt-1">{card.value}</p>
              </div>
              <card.icon className={cn("h-5 w-5", card.iconColor)} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}