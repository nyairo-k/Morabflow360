import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/Inventory/components/ui/dialog";
import { Button } from "@/components/Inventory/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Inventory/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/Inventory/components/ui/table";
import { Badge } from "@/components/Inventory/components/ui/badge";
import { Separator } from "@/components/Inventory/components/ui/separator";
import { Building, User, ShoppingCart, CheckCircle, XCircle } from "lucide-react";
import type { Invoice, InvoiceLineItem, FulfillmentSource } from "@/components/Inventory/types";

interface DispatchApprovalDialogProps {
  invoice: Invoice;
  open: boolean;
  onClose: () => void;
  // It now expects the master onAction handler
  onAction: (action: string, data: any) => void;
  currentUser: UserType;
}

export function DispatchApprovalDialog({ 
  invoice, 
  open, 
  onClose, 
  onAction,
  currentUser
}: DispatchApprovalDialogProps) {

  const getSourceIcon = (source: FulfillmentSource) => {
    switch (source) {
      case 'MAIN_HQ':
      case 'NYAMIRA':
        return <Building className="h-4 w-4" />;
      case 'FIELD_REP':
        return <User className="h-4 w-4" />;
      case 'OUTSOURCE':
        return <ShoppingCart className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getSourceLabel = (source: FulfillmentSource) => {
    switch (source) {
      case 'MAIN_HQ':
        return 'Main HQ Store';
      case 'NYAMIRA':
        return 'Nyamira Store';
      case 'FIELD_REP':
        return 'Field Rep Stock';
      case 'OUTSOURCE':
        return 'Outsource';
      default:
        return 'Not Assigned';
    }
  };

  const renderAssignmentSummary = (item: InvoiceLineItem) => {
    if (!item.fulfillmentSource) return <span className="text-muted-foreground">Not assigned</span>;

    switch (item.fulfillmentSource) {
      case 'MAIN_HQ':
      case 'NYAMIRA':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {getSourceIcon(item.fulfillmentSource)}
              <span className="text-sm font-medium">{getSourceLabel(item.fulfillmentSource)}</span>
            </div>
            {item.serialNumbers?.[0] && (
              <div className="text-xs text-muted-foreground">
                Serial: {item.serialNumbers[0]}
              </div>
            )}
          </div>
        );

      case 'FIELD_REP':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {getSourceIcon(item.fulfillmentSource)}
              <span className="text-sm font-medium">Field Rep</span>
            </div>
            {item.assignedRep && (
              <div className="text-xs text-muted-foreground">
                Rep: {item.assignedRep}
              </div>
            )}
            {item.serialNumbers?.[0] && (
              <div className="text-xs text-muted-foreground">
                Serial: {item.serialNumbers[0]}
              </div>
            )}
          </div>
        );

      case 'OUTSOURCE':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {getSourceIcon(item.fulfillmentSource)}
              <span className="text-sm font-medium">Outsource</span>
            </div>
            {item.poId && (
              <Badge variant="outline" className="text-xs">
                PO: {item.poId}
              </Badge>
            )}
          </div>
        );

      default:
        return <span className="text-muted-foreground">Unknown source</span>;
    }
  };

   const handleApprove = () => {
    onAction('approveDispatch', { 
      invoiceId: invoice.invoiceId,
      approvedBy: currentUser.name
    });
    onClose();
  };

  const handleReject = () => {
    onAction('rejectDispatch', { 
      invoiceId: invoice.invoiceId,
      rejectedBy: currentUser.name
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Dispatch Approval - {invoice.invoiceId}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Customer Information</CardTitle>
                </CardHeader>
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

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Items:</span>
                    <span className="font-medium">{invoice.lineItems.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Quantity:</span>
                    <span className="font-medium">
                      {invoice.lineItems.reduce((sum, item) => sum + item.quantity, 0)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total Amount:</span>
                    <span>KSh {invoice.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Assigned Items for Dispatch</h3>
            
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Fulfillment Assignment</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lineItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">{item.productId}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{item.quantity}</TableCell>
                      <TableCell className="font-mono">KSh {item.unitPrice.toLocaleString()}</TableCell>
                      <TableCell className="font-mono font-medium">
                        KSh {(item.quantity * item.unitPrice).toLocaleString()}
                      </TableCell>
                      <TableCell className="min-w-[200px]">
                        {renderAssignmentSummary(item)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="success">Ready to Dispatch</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              All items have been assigned fulfillment sources and are ready for dispatch. 
              Review the assignments above and approve to move to dispatch queue.
            </p>
          </div>

          <Separator />

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              <XCircle className="h-4 w-4 mr-2" />
              Reject Assignment
            </Button>
            <Button onClick={handleApprove}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve for Dispatch
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}