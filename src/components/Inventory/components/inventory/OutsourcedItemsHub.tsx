import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Inventory/components/ui/card";
import { Button } from "@/components/Inventory/components/ui/button";
import { Badge } from "@/components/Inventory/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/Inventory/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import { PaymentDialog } from "./PaymentDialog";
import { Building, Phone, DollarSign, Package, CreditCard } from "lucide-react";
import type { PurchaseOrder } from "@/components/Inventory/types";
import { User } from "@/types/requisition";

// The props the component now receives from its parent
interface OutsourcedItemsHubProps {
  purchaseOrders: PurchaseOrder[];
  onAction: (action: string, data: any) => void;
  currentUser: User;
}

export function OutsourcedItemsHub({ 
  purchaseOrders = [], 
  onAction, 
  currentUser 
}: OutsourcedItemsHubProps) {

  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // Helper functions are modified to be robust for live data
  const getTotalPaid = (po: PurchaseOrder) => {
    const details = (typeof po.paymentDetailsToSupplier === 'string' && po.paymentDetailsToSupplier) 
      ? JSON.parse(po.paymentDetailsToSupplier) 
      : po.paymentDetailsToSupplier || [];
    return details.reduce((sum, payment) => sum + Number(payment.amountPaid || 0), 0);
  };
  const getOutstandingAmount = (po: PurchaseOrder) => Number(po.purchasePrice) - getTotalPaid(po);
  const getProfitMargin = (po: PurchaseOrder) => Number(po.sellingPrice) - Number(po.purchasePrice);
  const getProfitPercentage = (po: PurchaseOrder) => {
    const sellingPrice = Number(po.sellingPrice);
    return sellingPrice > 0 ? (getProfitMargin(po) / sellingPrice) * 100 : 0;
  };
  
  // New handler to connect the dialog to the master onAction function
  const handlePaymentLogged = (paymentData: any, receiptFile: File | null) => {
    onAction('logSupplierPayment', { 
      purchaseOrder: selectedPO, 
      paymentData, 
      receiptFile,
      loggedBy: currentUser.name 
    });
    setSelectedPO(null); // Close the dialog
  };

  // Summary metrics now calculated from the live 'purchaseOrders' prop
  const unpaidCount = purchaseOrders.filter(po => po.paymentStatusToSupplier === 'Unpaid').length;
  const partialCount = purchaseOrders.filter(po => po.paymentStatusToSupplier === 'Partially Paid').length;
  const paidCount = purchaseOrders.filter(po => po.paymentStatusToSupplier === 'Paid').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Outsourced Items Hub</h2>
          <p className="text-muted-foreground">Manage supplier purchases and payments</p>
        </div>
      </div>

      {/* Summary Cards now use live, calculated data */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total POs</p>
                <p className="text-2xl font-bold">{purchaseOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-status-unpaid" />
              <div>
                <p className="text-sm text-muted-foreground">Unpaid</p>
                <p className="text-2xl font-bold text-status-unpaid">{unpaidCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-status-processing" />
              <div>
                <p className="text-sm text-muted-foreground">Partial</p>
                <p className="text-2xl font-bold text-status-processing">{partialCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-status-paid" />
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-status-paid">{paidCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO ID</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Purchase Price</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* The table now maps over the live 'purchaseOrders' prop */}
              {purchaseOrders.map((po) => (
                <TableRow key={po.poId}>
                  <TableCell className="font-medium">{po.poId}</TableCell>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        <span className="font-medium">{po.supplierName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {po.supplierPhone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">Product {po.productId}</p>
                      <p className="text-xs text-muted-foreground">Invoice: {po.relatedInvoiceId}</p>
                    </div>
                  </TableCell>
                  <TableCell>KSh {Number(po.purchasePrice).toLocaleString()}</TableCell>
                  <TableCell>KSh {Number(po.sellingPrice).toLocaleString()}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-status-completed">
                        +KSh {getProfitMargin(po).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getProfitPercentage(po).toFixed(1)}%
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge 
                      status={po.paymentStatusToSupplier === 'Paid' ? 'paid' : 
                             po.paymentStatusToSupplier === 'Partially Paid' ? 'processing' : 'unpaid'}
                    >
                      {po.paymentStatusToSupplier}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <span className={getOutstandingAmount(po) > 0 ? 'text-status-unpaid font-medium' : 'text-muted-foreground'}>
                      KSh {getOutstandingAmount(po).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    {po.paymentStatusToSupplier !== 'Paid' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedPO(po)}
                        className="text-xs"
                      >
                        Log Payment
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedPO && (
        <PaymentDialog
          open={!!selectedPO}
          onClose={() => setSelectedPO(null)}
          purchaseOrder={selectedPO}
          onPaymentLogged={handlePaymentLogged}
        />
      )}
    </div>
  );
}