import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/Inventory/components/ui/card";
import { Button } from "@/components/Inventory/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/Inventory/components/ui/tabs";
import { Package, Clock, CheckCircle, Truck } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { InvoiceAssignmentDialog } from "./InvoiceAssignmentDialog";
import { DispatchApprovalDialog } from "./DispatchApprovalDialog";
import { OutsourcedItemsHub } from "./OutsourcedItemsHub";
import type { Invoice, PurchaseOrder, Supplier } from "@/components/Inventory/types"; // Import all necessary types
import { User } from "@/types/requisition";

interface FulfillmentCenterProps {
  currentUser: User;
  invoices: Invoice[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  dispatchOrders: any[];
  onAction: (action: string, data: any) => void;
}

export function FulfillmentCenter({
  currentUser,
  invoices = [], // Default to empty array for safety
  suppliers = [],
  purchaseOrders = [],
  dispatchOrders = [],
  fieldReps = [],
  onAction
}: FulfillmentCenterProps) {
  
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [dispatchInvoice, setDispatchInvoice] = useState<Invoice | null>(null);


const invoicesWithFulfillmentStatus = useMemo(() => {
    return invoices.map(invoice => {
      const relatedDispatchItems = dispatchOrders.filter(d => d.invoiceId === invoice.invoiceId);
      
      let fulfillmentStatus = 'AWAITING_FULFILLMENT'; // Default status
      if (relatedDispatchItems.length > 0) {
        // If ALL items are approved, the order is ready for the final dispatch
        if (relatedDispatchItems.every(d => d.dispatchApprovalStatus === 'Approved')) {
          fulfillmentStatus = 'READY_FOR_DISPATCH';
        } 
        // If ANY item is still pending approval, the whole order is in that state
        else if (relatedDispatchItems.some(d => d.dispatchApprovalStatus === 'Pending Approval')) {
          fulfillmentStatus = 'PENDING_APPROVAL';
        }
      }
      
      // We return a new, enriched invoice object
      return { ...invoice, fulfillmentStatus, dispatchItems: relatedDispatchItems };
    });
  }, [invoices, dispatchOrders]);




  const getStatusIcon = (status: string) => {
    switch (status) {
      case "AWAITING_FULFILLMENT":
        return <Clock className="h-4 w-4" />;
      case "ASSIGNED":
        return <Package className="h-4 w-4" />;
      case "DISPATCHED":
        return <Truck className="h-4 w-4" />;
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "AWAITING_FULFILLMENT":
        return "awaiting";
      case "ASSIGNED":
        return "assigned";
      case "DISPATCHED":
        return "dispatched";
      case "COMPLETED":
        return "completed";
      default:
        return "pending";
    }
  };

const handleInvoiceClick = (invoice) => {
    // We now use the calculated fulfillmentStatus to decide which dialog to open
    if (invoice.fulfillmentStatus === 'PENDING_APPROVAL') {
      setDispatchInvoice(invoice);
    } else {
      setSelectedInvoice(invoice);
    }
  };
const handleDispatchApprove = (invoiceId: string) => {
    const invoice = invoicesWithFulfillmentStatus.find(inv => inv.invoiceId === invoiceId);
    if (invoice) {
      onAction('approveDispatch', { 
        invoiceId: invoice.invoiceId,
        dispatchItemIds: invoice.dispatchItems.map(item => item.dispatchItemId),
        approvedBy: currentUser.name 
      });
    }
    setDispatchInvoice(null);
  };

const handleDispatchReject = (invoiceId: string) => {
      const invoice = invoicesWithFulfillmentStatus.find(inv => inv.invoiceId === invoiceId);
    if (invoice) {
      onAction('rejectDispatch', { 
        invoiceId: invoice.invoiceId,
        dispatchItemIds: invoice.dispatchItems.map(item => item.dispatchItemId),
        rejectedBy: currentUser.name 
      });
    }
    setDispatchInvoice(null);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fulfillment Center</h1>
            <p className="text-muted-foreground">Manage inventory fulfillment and outsourcing operations</p>
          </div>
        </div>

        <Tabs value={activeTab} onValue-Change={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-[600px] grid-cols-3">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Orders
            </TabsTrigger>
            <TabsTrigger value="outsourced" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Outsourced Items
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Completed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* MODIFICATION: We now map over the new, intelligent data array */}
              {invoicesWithFulfillmentStatus
                .filter(inv => inv.fulfillmentStatus === 'AWAITING_FULFILLMENT' || inv.fulfillmentStatus === 'PENDING_APPROVAL')
                .map((invoice) => (
                <Card key={invoice.invoiceId} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{invoice.invoiceId}</CardTitle>
                      {/* MODIFICATION: The status badge now uses the CALCULATED fulfillmentStatus */}
                      <StatusBadge status={getStatusVariant(invoice.fulfillmentStatus)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(invoice.fulfillmentStatus)}
                          {invoice.fulfillmentStatus.replace('_', ' ')}
                        </div>
                      </StatusBadge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="font-medium">{invoice.customerName}</p>
                      <p className="text-sm text-muted-foreground">{invoice.customerPhone}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Items: {invoice.lineItems.length}</p>
                      <p className="text-lg font-bold">KSh {invoice.totalAmount.toLocaleString()}</p>
                    </div>

                    {/* MODIFICATION: The button now uses the CALCULATED fulfillmentStatus */}
                    <Button 
                      className="w-full" 
                      onClick={() => handleInvoiceClick(invoice)}
                      disabled={invoice.fulfillmentStatus === "COMPLETED" || invoice.fulfillmentStatus === "DISPATCHED"}
                    >
                      {invoice.fulfillmentStatus === "AWAITING_FULFILLMENT" ? "Assign Fulfillment" : "Approve Dispatch"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* MODIFICATION: The empty state check also uses the new data array */}
            {invoicesWithFulfillmentStatus.filter(inv => inv.fulfillmentStatus === 'AWAITING_FULFILLMENT' || inv.fulfillmentStatus === 'PENDING_APPROVAL').length === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No pending orders</h3>
                  <p className="text-muted-foreground">All orders have been processed.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="outsourced">
            {/* MODIFICATION: Pass the correct props */}
            <OutsourcedItemsHub purchaseOrders={purchaseOrders} onAction={onAction} currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="completed">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
               {/* MODIFICATION: We now filter by the new calculated status */}
               {invoicesWithFulfillmentStatus
                .filter(inv => inv.fulfillmentStatus === 'DISPATCHED' || inv.fulfillmentStatus === 'COMPLETED')
                .map((invoice) => (
                  <Card key={invoice.invoiceId} className="opacity-70">
                    <CardHeader><CardTitle>{invoice.invoiceId}</CardTitle></CardHeader>
                    <CardContent><p>{invoice.customerName}</p><p className="font-bold">{invoice.fulfillmentStatus.replace('_',' ')}</p></CardContent>
                  </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

      {selectedInvoice && (
        <InvoiceAssignmentDialog
          invoice={selectedInvoice}
          suppliers={suppliers}
          fieldReps={fieldReps}
          onAction={onAction}
          open={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          currentUser={currentUser}
        />
      )}

      {dispatchInvoice && (
        <DispatchApprovalDialog
          invoice={dispatchInvoice}
          // MODIFICATION: Pass the calculated dispatchItems down to the dialog
          dispatchItems={dispatchInvoice.dispatchItems}
          open={!!dispatchInvoice}
          onClose={() => setDispatchInvoice(null)}
          onAction={onAction}
          currentUser={currentUser}
        />
      )}
      </div>
    </div>
  );
}