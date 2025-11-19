import { Card, CardContent, CardHeader, CardTitle } from "@/components/Inventory/components/ui/card";
import { Badge } from "@/components/Inventory/components/ui/badge";
import { Progress } from "@/components/Inventory/components/ui/progress";
import { Building, User, ShoppingCart, Package, CheckCircle } from "lucide-react";
import type { InvoiceLineItem, FulfillmentSplit } from "@/components/Inventory/types";

interface FulfillmentSummaryProps {
  lineItems: InvoiceLineItem[];
  totalAmount: number;
}

export function FulfillmentSummary({ lineItems, totalAmount }: FulfillmentSummaryProps) {
  const activeAssignments = lineItems
    .filter((item) => !item.skipFulfillment)
    .flatMap((item) => {
      if (item.fulfillmentSplits && item.fulfillmentSplits.length > 0) {
        return item.fulfillmentSplits.map((split) => ({
          ...split,
          quantity: split.quantity || 0,
        }));
      }

      const fallbackSplit: FulfillmentSplit = {
        id: `${item.id}-fallback`,
        parentItemId: item.id,
        quantity: item.quantity,
        fulfillmentSource: item.fulfillmentSource,
        serialNumbers: item.serialNumbers,
        assignedRep: item.assignedRep,
        poId: item.poId,
        assignedLocation: item.assignedLocation,
        assignedSupplierName: item.assignedSupplierName,
        assignedSupplierPhone: item.assignedSupplierPhone,
      };

      return [fallbackSplit];
    });

  const summary = activeAssignments.reduce((acc, split) => {
    if (!split.fulfillmentSource) {
      acc.unassigned += 1;
      return acc;
    }

    const isComplete = (() => {
      switch (split.fulfillmentSource) {
        case 'MAIN_HQ':
        case 'NYAMIRA':
          return !!split.serialNumbers && split.serialNumbers.length >= (split.quantity || 0);
        case 'FIELD_REP':
          return !!split.assignedRep && !!split.serialNumbers && split.serialNumbers.length >= (split.quantity || 0);
        case 'OUTSOURCE':
          return !!split.poId;
        default:
          return false;
      }
    })();

    acc[split.fulfillmentSource] += 1;
    if (isComplete) acc.complete += 1;
    
    return acc;
  }, {
    MAIN_HQ: 0,
    NYAMIRA: 0,
    FIELD_REP: 0,
    OUTSOURCE: 0,
    unassigned: 0,
    complete: 0
  });

  const totalAssignments = activeAssignments.length;
  const completionRate = totalAssignments > 0 ? (summary.complete / totalAssignments) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Fulfillment Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Invoice Items</p>
            <p className="text-2xl font-bold">{lineItems.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fulfillment Units</p>
            <p className="text-2xl font-bold">{totalAssignments}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold">KSh {totalAmount.toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Completion Progress</span>
            <span className="text-sm text-muted-foreground">{Math.round(completionRate)}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="h-3 w-3" />
            {summary.complete} of {Math.max(totalAssignments, 1)} fulfillment units ready for dispatch
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {summary.MAIN_HQ > 0 && (
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-primary" />
                <span className="text-sm">Main HQ</span>
              </div>
              <Badge variant="outline">{summary.MAIN_HQ}</Badge>
            </div>
          )}
          
          {summary.NYAMIRA > 0 && (
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-primary" />
                <span className="text-sm">Nyamira</span>
              </div>
              <Badge variant="outline">{summary.NYAMIRA}</Badge>
            </div>
          )}
          
          {summary.FIELD_REP > 0 && (
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span className="text-sm">Field Rep</span>
              </div>
              <Badge variant="outline">{summary.FIELD_REP}</Badge>
            </div>
          )}
          
          {summary.OUTSOURCE > 0 && (
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <span className="text-sm">Outsource</span>
              </div>
              <Badge variant="outline">{summary.OUTSOURCE}</Badge>
            </div>
          )}
          
          {summary.unassigned > 0 && (
            <div className="flex items-center justify-between p-2 bg-warning/10 rounded">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-warning" />
                <span className="text-sm">Unassigned</span>
              </div>
              <Badge variant="warning">{summary.unassigned}</Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}