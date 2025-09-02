import { useState, useMemo } from "react"; // Added useMemo for efficiency
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/Inventory/components/ui/dialog";
import { Button } from "@/components/Inventory/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Inventory/components/ui/card";
import { Separator } from "@/components/Inventory/components/ui/separator";
import { FulfillmentTable } from "./FulfillmentTable";
import { FulfillmentSummary } from "./FulfillmentSummary";
import type { Invoice, InvoiceLineItem, Supplier } from "@/components/Inventory/types"; // Import Supplier

// ====== 1. UPDATE THE PROPS INTERFACE ======
interface InvoiceAssignmentDialogProps {
  invoice: Invoice;
  suppliers: Supplier[]; // It needs the list of suppliers for the outsourcing flow
  currentUser: User;
  fieldReps: FieldRep[];
  open: boolean;
  onClose: () => void;
  onAction: (action: string, data: any) => void;
}

export function InvoiceAssignmentDialog({ 
  invoice, 
  suppliers, 
  currentUser, // <-- ADD THIS
  fieldReps = [],  // <-- ADD THIS (with a default value)
  open, 
  onClose, 
  onAction 
}: InvoiceAssignmentDialogProps) {
  
  // ====== 2. MANAGE ITEM STATE LOCALLY FOR EDITING ======
  // This state holds the "draft" of the fulfillment plan. It starts as a copy of the invoice items.
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(invoice.lineItems);

  // This handler now updates our local "draft" state.
  const updateLineItem = (itemId: string, updates: Partial<InvoiceLineItem>) => {
    setLineItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ));
  };

  // The logic to check if the plan is complete is still correct.
  const canSubmit = useMemo(() => {
    return lineItems.every(item => {
      if (!item.fulfillmentSource) return false;
      switch (item.fulfillmentSource) {
        case 'MAIN_HQ':
        case 'NYAMIRA':
          return item.serialNumbers && item.serialNumbers.length > 0;
        case 'FIELD_REP':
          return item.assignedRep && item.serialNumbers && item.serialNumbers.length > 0;
        case 'OUTSOURCE':
          return !!item.poId;
        default:
          return false;
      }
    });
  }, [lineItems]);


  // ====== 3. REFECTOR THE SUBMISSION HANDLER ======
  const handleSubmit = () => {
    // Create a unified fulfillment plan data structure
    const fulfillmentPlanData = {
      action: 'submitFulfillmentPlan',
      invoiceId: invoice.invoiceId,
      assignedBy: currentUser.name,
      assignedDate: new Date().toISOString(),
      lineItems: lineItems.map(item => ({
        productId: item.productId,
        quantityToDispatch: item.quantity,
        fulfillmentSource: item.fulfillmentSource,
        // FIX: Map source details correctly based on fulfillment source
        sourceDetails: item.fulfillmentSource === 'OUTSOURCE' ? 'Outsource' :
                      item.fulfillmentSource === 'MAIN_HQ' ? 'Main HQ Store' :
                      item.fulfillmentSource === 'NYAMIRA' ? 'Nyamira Store' :
                      item.fulfillmentSource === 'FIELD_REP' ? 'Field Rep Stock' : '',
        // FIX: Sales Rep should only be populated for FIELD_REP items
        salesRep: item.fulfillmentSource === 'FIELD_REP' ? item.assignedRep : '',
        // Add other necessary fields
        serialNumbers: item.serialNumbers || [],
        assignedLocation: item.assignedLocation || '',
        poId: item.poId || ''
      }))
    };
    
    // Send the unified command
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
              onLineItemUpdate={updateLineItem}
              // The table now needs the onAction handler for creating Purchase Orders
              onAction={onAction} 
              suppliers={suppliers}
              fieldReps={fieldReps}
            />
          </div>

          <Separator />

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              Submit for Dispatch Approval
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}