import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Inventory/components/ui/card";
import { Button } from "@/components/Inventory/components/ui/button";
import { Badge } from "@/components/Inventory/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/Inventory/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import { PaymentDialog } from "./PaymentDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle as UIDialogTitle } from "@/components/Inventory/components/ui/dialog";
import { Building, Phone, DollarSign, Package, CreditCard, Eye, Calendar, Receipt, TrendingUp } from "lucide-react"; // Add TrendingUp for profit
import type { PurchaseOrder } from "@/components/Inventory/types";
import { User } from "@/types/requisition";
import { usePagination } from "@/hooks/use-pagination";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/Inventory/components/ui/pagination";

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
  const [historyPO, setHistoryPO] = useState<PurchaseOrder | null>(null); // Modal for payment history

  // Helper functions are modified to be robust for live data
  const getTotalPaid = (po: PurchaseOrder) => {
    const paymentHistory = getPaymentHistory(po);
    return paymentHistory.reduce((sum, payment) => sum + Number(payment.amount || payment.amountPaid || 0), 0);
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

  // NEW: Function to parse payment details safely
  const getPaymentHistory = (po: PurchaseOrder) => {
    try {
      if (po.paymentDetailsToSupplier) {
        if (typeof po.paymentDetailsToSupplier === 'string') {
          return JSON.parse(po.paymentDetailsToSupplier);
        } else if (Array.isArray(po.paymentDetailsToSupplier)) {
          return po.paymentDetailsToSupplier;
        }
      }
      return [];
    } catch (error) {
      console.error('Error parsing payment details:', error);
      return [];
    }
  };

  // NEW: Function to format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // FIX: Better data validation that handles the actual data structure
  const validPurchaseOrders = purchaseOrders.filter(po => 
    po.poId && 
    po.relatedInvoiceId && 
    po.supplierName &&
    po.purchasePrice !== undefined &&
    po.sellingPrice !== undefined
  );

  console.log('=== DEBUGGING PURCHASE ORDERS ===');
  console.log('Raw purchaseOrders from Google Sheets:', purchaseOrders);
  validPurchaseOrders.forEach((po, index) => {
    console.log(`PO ${index}:`, {
      poId: po.poId,
      paymentStatusToSupplier: po.paymentStatusToSupplier,
      paymentDetailsToSupplier: po.paymentDetailsToSupplier,
      allFields: po
    });
  });

  // FIX: Handle payment status case variations
  const getPaymentStatusVariant = (status: string) => {
    const upperStatus = status.toUpperCase();
    if (upperStatus === 'PAID') return 'success';
    if (upperStatus === 'PARTIAL') return 'processing';
    return 'secondary';
  };
  
  // Summary metrics now calculated from the live 'purchaseOrders' prop
  const unpaidCount = validPurchaseOrders.filter(po => po.paymentStatusToSupplier === 'UNPAID').length;
  const partialCount = validPurchaseOrders.filter(po => po.paymentStatusToSupplier === 'PARTIAL').length;
  const paidCount = validPurchaseOrders.filter(po => po.paymentStatusToSupplier === 'PAID').length;

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
                <p className="text-2xl font-bold">{validPurchaseOrders.length}</p>
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
              <Building className="h-4 w-4 text-status-completed" />
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-status-completed">{paidCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FIX: Show the actual purchase orders with improved UI design */}
      {(() => {
        const { page, totalPages, setPage, slice } = usePagination({ totalItems: validPurchaseOrders.length, initialPage: 1, initialPageSize: 10 });
        const paginatedPOs = useMemo(() => {
          const [start, end] = slice;
          return validPurchaseOrders.slice(start, end);
        }, [validPurchaseOrders, slice]);
        return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Purchase Orders</h3>
        {validPurchaseOrders.length === 0 ? (
          <Card className="text-center py-8">
            <CardContent>
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No purchase orders found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-medium text-gray-700">PO ID</TableHead>
                  <TableHead className="font-medium text-gray-700">Supplier</TableHead>
                  <TableHead className="font-medium text-gray-700">Product</TableHead>
                  <TableHead className="font-medium text-gray-700">Purchase Price</TableHead>
                  <TableHead className="font-medium text-gray-700">Selling Price</TableHead>
                  <TableHead className="font-medium text-gray-700">Profit</TableHead>
                  <TableHead className="font-medium text-gray-700">Payment Status</TableHead>
                  <TableHead className="font-medium text-gray-700">Outstanding</TableHead>
                  <TableHead className="font-medium text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPOs.map((po) => {
                  const paymentHistory = getPaymentHistory(po);
                  const hasPayments = paymentHistory.length > 0;
                  const totalPaid = getTotalPaid(po);
                  const outstanding = getOutstandingAmount(po);
                  const profit = getProfitMargin(po);
                  const profitPercent = getProfitPercentage(po);

                  return (
                    <TableRow key={po.poId} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm font-medium text-gray-900">
                        {po.poId}
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-gray-900">{po.supplierName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="h-3 w-3" />
                            {po.supplierPhone}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-gray-900">{po.productName || 'N/A'}</p>
                          <p className="text-sm text-gray-600">Invoice: {po.relatedInvoiceId}</p>
                        </div>
                      </TableCell>
                      
                      <TableCell className="font-mono text-gray-900">
                        KSh {Number(po.purchasePrice).toLocaleString()}
                      </TableCell>
                      
                      <TableCell className="font-mono text-gray-900">
                        KSh {Number(po.sellingPrice).toLocaleString()}
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-right">
                          <p className={`font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {profit >= 0 ? '+' : ''}KSh {profit.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            {profitPercent.toFixed(1)}%
                          </p>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge 
                          variant={
                            (po.paymentStatusToSupplier || 'UNPAID') === 'PAID' ? 'success' : 
                            (po.paymentStatusToSupplier || 'UNPAID') === 'PARTIAL' ? 'processing' : 
                            'secondary'
                          }
                          className={
                            (po.paymentStatusToSupplier || 'UNPAID') === 'PAID' ? 'bg-green-100 text-green-800 border-green-200' :
                            (po.paymentStatusToSupplier || 'UNPAID') === 'PARTIAL' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            'bg-red-100 text-red-800 border-red-200'
                          }
                        >
                          {po.paymentStatusToSupplier || 'UNPAID'}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <p className={`font-semibold ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          KSh {outstanding.toLocaleString()}
                        </p>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex gap-2">
                          {/* Payment History Button */}
                          {hasPayments && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setHistoryPO(po)}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <Calendar className="h-4 w-4 mr-1" />
                              History
                            </Button>
                          )}
                          
                          {/* Log Payment Button (hidden for InventoryStaff) */}
                          {currentUser.role !== 'InventoryStaff' && (
                            <Button 
                              onClick={() => setSelectedPO(po)}
                              variant="outline"
                              disabled={po.paymentStatusToSupplier === 'PAID'}
                              className="bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-200"
                            >
                              Log Payment
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="pt-4 p-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage(Math.max(1, page - 1)); }} />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(Math.max(0, page - 3), Math.max(0, page - 3) + 5)
                    .map((n) => (
                      <PaginationItem key={n}>
                        <PaginationLink href="#" isActive={n === page} onClick={(e) => { e.preventDefault(); setPage(n); }}>{n}</PaginationLink>
                      </PaginationItem>
                    ))}
                  <PaginationItem>
                    <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage(Math.min(totalPages, page + 1)); }} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </div>
        );
      })()}

      {/* Payment History Section - Modal */}
      <Dialog open={!!historyPO} onOpenChange={(open) => !open && setHistoryPO(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <UIDialogTitle>Payment History{historyPO ? ` - ${historyPO.poId}` : ''}</UIDialogTitle>
          </DialogHeader>
          {historyPO && (() => {
            const paymentHistory = getPaymentHistory(historyPO);
            const hasPayments = paymentHistory.length > 0;
            return hasPayments ? (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto p-1">
                {paymentHistory.map((payment: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium">KSh {Number(payment.amount || payment.amountPaid).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <span className="font-mono text-sm">{payment.mpesaCode}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-600" />
                        <span className="text-sm">{formatDate(payment.date || payment.paymentDate)}</span>
                      </div>
                      {payment.loggedBy && (
                        <span className="text-sm text-gray-600">by {payment.loggedBy}</span>
                      )}
                    </div>
                    {payment.receiptUrl && (
                      <Button asChild size="sm" variant="outline" className="text-xs">
                        <a href={payment.receiptUrl} target="_blank" rel="noopener">
                          <Receipt className="h-4 w-4 mr-1" /> View Receipt
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No payments recorded yet.</div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog - hidden for InventoryStaff */}
      {currentUser.role !== 'InventoryStaff' && selectedPO && (
        <PaymentDialog
          open={!!selectedPO}
          onClose={() => setSelectedPO(null)}
          purchaseOrder={selectedPO}
          onPaymentLogged={handlePaymentLogged}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}