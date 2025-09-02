import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/Inventory/components/ui/dialog";
import { Button } from "@/components/Inventory/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Inventory/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/Inventory/components/ui/table";
import { Badge } from "@/components/Inventory/components/ui/badge";
import { StatusBadge } from "./StatusBadge";
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
  dispatchItems, 
  open, 
  onClose, 
  onAction, 
  currentUser 
}: DispatchApprovalDialogProps) {

  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleApproveAll = async () => {
    setIsProcessing(true);
    try {
      // Get all dispatch item IDs that are pending approval
      const pendingDispatchIds = dispatchItems
        .filter(item => item.dispatchApprovalStatus === 'Pending Approval')
        .map(item => item.dispatchItemId);

      if (pendingDispatchIds.length === 0) {
        // No pending items to approve
        return;
      }

      // Call the master action handler to approve all items
      await onAction('approveDispatch', {
        invoiceId: invoice.invoiceId,
        dispatchItemIds: pendingDispatchIds,
        approvedBy: currentUser.name
      });

      onClose(); // Close the dialog after successful approval
    } catch (error) {
      console.error('Error approving dispatch:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectAll = async () => {
    setIsProcessing(true);
    try {
      // Get all dispatch item IDs that are pending approval
      const pendingDispatchIds = dispatchItems
        .filter(item => item.dispatchApprovalStatus === 'Pending Approval')
        .map(item => item.dispatchItemId);

      if (pendingDispatchIds.length === 0) {
        // No pending items to reject
        return;
      }

      // Call the master action handler to reject all items
      await onAction('rejectDispatch', {
        invoiceId: invoice.invoiceId,
        dispatchItemIds: pendingDispatchIds,
        rejectedBy: currentUser.name
      });

      onClose(); // Close the dialog after successful rejection
    } catch (error) {
      console.error('Error rejecting dispatch:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dispatch Approval - {invoice.invoiceId}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
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

          {/* Fulfillment Assignment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Fulfillment Assignment Review</h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Fulfillment Source</TableHead>
                    <TableHead>Source Details</TableHead>
                    <TableHead>Assigned By</TableHead>
                    <TableHead>Assignment Date</TableHead>
                    <TableHead>Sales Rep</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dispatchItems.map((item) => (
                    <TableRow key={item.dispatchItemId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.productId || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">ID: {item.dispatchItemId}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{item.quantityToDispatch}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.sourceDetails === 'Main HQ Store' ? 'Main HQ' :
                           item.sourceDetails === 'Nyamira Store' ? 'Nyamira' :
                           item.sourceDetails === 'Field Rep Stock' ? 'Field Rep' :
                           item.sourceDetails === 'Outsource' ? 'Outsource' :
                           item.sourceDetails}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.sourceDetails === 'Field Rep Stock' ? 
                          (item.salesRep || 'Not assigned') :
                          item.sourceDetails
                        }
                      </TableCell>
                      <TableCell>{item.assignedBy}</TableCell>
                      <TableCell>
                        {new Date(item.assignmentDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {item.salesRep || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.dispatchApprovalStatus.toLowerCase()}>
                          {item.dispatchApprovalStatus}
                        </StatusBadge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Approval Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Dispatch Approval</h3>
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={handleApproveAll}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? "Processing..." : "Approve All Items"}
              </Button>
              <Button 
                variant="outline"
                onClick={handleRejectAll}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? "Processing..." : "Reject All Items"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}