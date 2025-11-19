import { useState, useMemo, useEffect } from "react"; // Added useMemo for efficiency
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/Inventory/components/ui/dialog";
import { Button } from "@/components/Inventory/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Inventory/components/ui/card";
import { Separator } from "@/components/Inventory/components/ui/separator";
import { FulfillmentTable } from "./FulfillmentTable";
import { FulfillmentSummary } from "./FulfillmentSummary";
import type { Invoice, InvoiceLineItem, Supplier, PurchaseOrder, FieldRep, FulfillmentSource, FulfillmentSplit } from "@/components/Inventory/types"; // Import Supplier
import { User as UserType } from "@/types/requisition";

const generateSplitId = (seed: string) => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${seed}-${crypto.randomUUID()}`;
  }
  return `${seed}-${Math.random().toString(36).slice(2, 10)}`;
};

const buildSplitFromItem = (item: InvoiceLineItem, overrides: Partial<FulfillmentSplit> = {}): FulfillmentSplit => ({
  id: overrides.id || generateSplitId(item.id),
  parentItemId: item.id,
  quantity: overrides.quantity ?? item.quantity ?? 1,
  fulfillmentSource: overrides.fulfillmentSource ?? item.fulfillmentSource,
  serialNumbers: overrides.serialNumbers ?? item.serialNumbers ?? [],
  assignedLocation: overrides.assignedLocation ?? item.assignedLocation,
  assignedRep: overrides.assignedRep ?? item.assignedRep,
  poId: overrides.poId ?? item.poId,
  assignedSupplierName: overrides.assignedSupplierName ?? item.assignedSupplierName,
  assignedSupplierPhone: overrides.assignedSupplierPhone ?? item.assignedSupplierPhone,
});

const normalizeSplits = (item: InvoiceLineItem): FulfillmentSplit[] => {
  if (item.fulfillmentSplits && item.fulfillmentSplits.length > 0) {
    return item.fulfillmentSplits.map((split) =>
      buildSplitFromItem(item, {
        ...split,
        quantity: split.quantity ?? 1,
        id: split.id,
      })
    );
  }

  return [buildSplitFromItem(item)];
};

const initializeLineItems = (items: InvoiceLineItem[]): InvoiceLineItem[] =>
  items.map((item) => ({
    ...item,
    fulfillmentSplits: normalizeSplits(item),
    skipFulfillment: item.skipFulfillment ?? false,
  }));

// ====== 1. UPDATE THE PROPS INTERFACE ======
interface InvoiceAssignmentDialogProps {
  invoice: Invoice;
  suppliers: Supplier[]; // It needs the list of suppliers for the outsourcing flow
  purchaseOrders: PurchaseOrder[]; // Add this to access PO data
  currentUser: UserType;
  fieldReps: FieldRep[];
  open: boolean;
  onClose: () => void;
  onAction: (action: string, data: any) => void;
  readOnly?: boolean; // Add this
}

export function InvoiceAssignmentDialog({ 
  invoice, 
  suppliers, 
  purchaseOrders, // Add this
  currentUser, // <-- ADD THIS
  fieldReps = [],  // <-- ADD THIS (with a default value)
  open, 
  onClose, 
  onAction,
  readOnly = false // Add this
}: InvoiceAssignmentDialogProps) {
  
  // ====== 2. MANAGE ITEM STATE LOCALLY FOR EDITING ======
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(() => initializeLineItems(invoice.lineItems));

  useEffect(() => {
    setLineItems(initializeLineItems(invoice.lineItems));
  }, [invoice]);

  const updateLineItem = (itemId: string, updates: Partial<InvoiceLineItem>) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    );
  };

  const updateSplit = (itemId: string, splitId: string, updates: Partial<FulfillmentSplit>) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const splits = item.fulfillmentSplits ?? [];
        return {
          ...item,
          fulfillmentSplits: splits.map((split) =>
            split.id === splitId ? { ...split, ...updates } : split
          ),
        };
      })
    );
  };

  const updateSplitQuantity = (itemId: string, splitId: string, quantity: number) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const splits = item.fulfillmentSplits ?? [];
        const otherTotal = splits.reduce(
          (sum, split) => (split.id === splitId ? sum : sum + (split.quantity || 0)),
          0
        );
        const sanitizedQuantity = Math.max(1, Math.floor(quantity || 0));
        const maxAllowed = Math.max(1, item.quantity - otherTotal);
        const finalQuantity = Math.min(sanitizedQuantity, maxAllowed);

        return {
          ...item,
          fulfillmentSplits: splits.map((split) =>
            split.id === splitId ? { ...split, quantity: finalQuantity } : split
          ),
        };
      })
    );
  };

  const addSplit = (itemId: string, preferredQuantity?: number) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const splits = item.fulfillmentSplits ?? [];
        const allocated = splits.reduce((sum, split) => sum + (split.quantity || 0), 0);
        const remaining = item.quantity - allocated;
        if (remaining <= 0) {
          return item;
        }

        const quantity = Math.max(1, Math.min(preferredQuantity ?? remaining, remaining));
        const newSplit = buildSplitFromItem(item, { quantity });

        return {
          ...item,
          fulfillmentSplits: [...splits, newSplit],
        };
      })
    );
  };

  const removeSplit = (itemId: string, splitId: string) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const splits = item.fulfillmentSplits ?? [];
        if (splits.length <= 1) {
          return {
            ...item,
            fulfillmentSplits: [
              buildSplitFromItem(item, {
                quantity: item.quantity,
                fulfillmentSource: undefined,
                serialNumbers: [],
                assignedRep: undefined,
                poId: undefined,
                assignedLocation: undefined,
              }),
            ],
          };
        }

        const removedSplit = splits.find((split) => split.id === splitId);
        const remainingSplits = splits.filter((split) => split.id !== splitId);

        if (!removedSplit) {
          return item;
        }

        const [firstSplit, ...rest] = remainingSplits;
        const redistributedFirst = {
          ...firstSplit,
          quantity: (firstSplit.quantity || 0) + (removedSplit.quantity || 0),
        };

        return {
          ...item,
          fulfillmentSplits: [redistributedFirst, ...rest],
        };
      })
    );
  };

  const toggleSkipFulfillment = (itemId: string, skip: boolean) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, skipFulfillment: skip } : item))
    );
  };

  const allSplitsBalanced = useMemo(() => {
    return lineItems
      .filter((item) => !item.skipFulfillment)
      .every((item) => {
        const splits = item.fulfillmentSplits ?? [];
        const total = splits.reduce((sum, split) => sum + (split.quantity || 0), 0);
        return total === item.quantity;
      });
  }, [lineItems]);

  const isSplitComplete = (split: FulfillmentSplit): boolean => {
    if (!split.fulfillmentSource) return false;
    if ((split.quantity ?? 0) <= 0) return false;

    switch (split.fulfillmentSource) {
      case "MAIN_HQ":
      case "NYAMIRA":
        return true;
      case "FIELD_REP":
        return !!split.assignedRep;
      case "OUTSOURCE":
        return !!split.poId;
      default:
        return false;
    }
  };

  const canSubmit = useMemo(() => {
    const actionableItems = lineItems.filter((item) => !item.skipFulfillment);
    if (actionableItems.length === 0) {
      return true;
    }

    const allComplete = actionableItems.every((item) => {
      const splits = item.fulfillmentSplits ?? [];
      if (splits.length === 0) return false;
      return splits.every((split) => isSplitComplete(split));
    });

    const hasOutsourceSplit = actionableItems.some((item) =>
      (item.fulfillmentSplits ?? []).some((split) => split.fulfillmentSource === "OUTSOURCE")
    );

    return allSplitsBalanced && (allComplete || hasOutsourceSplit);
  }, [allSplitsBalanced, lineItems]);

  // ====== 3. REFECTOR THE SUBMISSION HANDLER ======
  const handleSubmit = () => {
    const flattenedLineItems = lineItems
      .filter((item) => !item.skipFulfillment)
      .flatMap((item) => {
        const splits = item.fulfillmentSplits && item.fulfillmentSplits.length > 0
          ? item.fulfillmentSplits
          : normalizeSplits(item);

        return splits.map((split) => ({
          productId: item.productId,
          quantityToDispatch: split.quantity,
          fulfillmentSource: split.fulfillmentSource,
          sourceDetails: split.fulfillmentSource === "OUTSOURCE"
            ? "Outsource"
            : split.fulfillmentSource === "MAIN_HQ"
              ? "Main HQ Store"
              : split.fulfillmentSource === "NYAMIRA"
                ? "Nyamira Store"
                : split.fulfillmentSource === "FIELD_REP"
                  ? "Field Rep Stock"
                  : "",
          salesRep: split.fulfillmentSource === "FIELD_REP" ? split.assignedRep : "",
          serialNumbers: split.serialNumbers || [],
          assignedLocation: split.assignedLocation || "",
          poId: split.poId || "",
        }));
      })
      .filter((entry) => !!entry.fulfillmentSource);

    const fulfillmentPlanData = {
      action: 'submitFulfillmentPlan',
      invoiceId: invoice.invoiceId,
      assignedBy: currentUser.name,
      assignedDate: new Date().toISOString(),
      lineItems: flattenedLineItems,
    };

    onAction('submitFulfillmentPlan', fulfillmentPlanData);
    onClose();
  };


 const getSourceLabel = (source: FulfillmentSource) => {
    switch (source) {
      case 'MAIN_HQ': return 'Main HQ Store';
      case 'NYAMIRA': return 'Nyamira Store';
      case 'FIELD_REP': return 'Field Rep Stock';
      case 'OUTSOURCE': return 'Outsource';
      default: return 'Not Assigned';
    }
  };


  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Fulfillment - {invoice.invoiceId}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader><CardTitle className="text-lg">Customer Information</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">{invoice.customerName}</p>
                      <p className="text-sm text-muted-foreground">{invoice.customerPhone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Invoice Date</p>
                      <p className="font-medium">{invoice.invoiceDate}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <FulfillmentSummary 
              lineItems={lineItems} 
              totalAmount={invoice.totalAmount} 
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Line Items Assignment</h3>
            {/* ====== 4. PASS PROPS DOWN TO THE TABLE ====== */}
            <FulfillmentTable
              lineItems={lineItems}
              invoiceId={invoice.invoiceId}
              onLineItemUpdate={readOnly ? undefined : updateLineItem}
              onSplitUpdate={readOnly ? undefined : updateSplit}
              onSplitQuantityChange={readOnly ? undefined : updateSplitQuantity}
              onSplitAdd={readOnly ? undefined : addSplit}
              onSplitRemove={readOnly ? undefined : removeSplit}
              onSkipToggle={readOnly ? undefined : toggleSkipFulfillment}
              onAction={onAction}
              suppliers={suppliers}
              purchaseOrders={purchaseOrders} // Add this
              readOnly={readOnly} // Add this
              fieldReps={fieldReps}
            />
          </div>

          <Separator />

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              disabled={!canSubmit || readOnly}
              onClick={handleSubmit}
            >
              {readOnly ? "View Only" : "Submit for Dispatch Approval"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}