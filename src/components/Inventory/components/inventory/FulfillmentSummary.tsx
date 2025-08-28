import { Card, CardContent, CardHeader, CardTitle } from "@/components/Inventory/components/ui/card";
import { Badge } from "@/components/Inventory/components/ui/badge";
import { Progress } from "@/components/Inventory/components/ui/progress";
import { Building, User, ShoppingCart, Package, CheckCircle } from "lucide-react";
import type { InvoiceLineItem } from "@/components/Inventory/types";

interface FulfillmentSummaryProps {
  lineItems: InvoiceLineItem[];
  totalAmount: number;
}

export function FulfillmentSummary({ lineItems, totalAmount }: FulfillmentSummaryProps) {
  const summary = lineItems.reduce((acc, item) => {
    if (!item.fulfillmentSource) {
      acc.unassigned += 1;
      return acc;
    }

    const isComplete = (() => {
      switch (item.fulfillmentSource) {
        case 'MAIN_HQ':
        case 'NYAMIRA':
          return item.serialNumbers && item.serialNumbers.length >= item.quantity;
        case 'FIELD_REP':
          return item.assignedRep && item.serialNumbers && item.serialNumbers.length >= item.quantity;
        case 'OUTSOURCE':
          return !!item.poId;
        default:
          return false;
      }
    })();

    acc[item.fulfillmentSource] += 1;
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

  const totalItems = lineItems.length;
  const completionRate = totalItems > 0 ? (summary.complete / totalItems) * 100 : 0;

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
            <p className="text-sm text-muted-foreground">Total Items</p>
            <p className="text-2xl font-bold">{totalItems}</p>
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
            {summary.complete} of {totalItems} items ready for dispatch
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