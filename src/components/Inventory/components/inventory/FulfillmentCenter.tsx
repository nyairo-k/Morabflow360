import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/Inventory/components/ui/card";
import { Button } from "@/components/Inventory/components/ui/button";
import { Input } from "@/components/Inventory/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/Inventory/components/ui/tabs";
import { Badge } from "@/components/Inventory/components/ui/badge";
import { Package, Clock, CheckCircle, Truck, ArrowRight, Calendar, User, Phone, RefreshCw, Search } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { InvoiceAssignmentDialog } from "./InvoiceAssignmentDialog";
import { DispatchApprovalDialog } from "./DispatchApprovalDialog";
import { OutsourcedItemsHub } from "./OutsourcedItemsHub";
import type { Invoice, PurchaseOrder, Supplier } from "@/components/Inventory/types";
import { User as UserType } from "@/types/requisition";
import { usePagination } from "@/hooks/use-pagination";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from "@/components/Inventory/components/ui/pagination";
import { StockManagement } from "./StockManagement";

interface FulfillmentCenterProps {
  currentUser: UserType;
  invoices: Invoice[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  dispatchOrders: any[];
  onAction: (action: string, data: any) => void;
  onRefresh?: () => Promise<void>;
  readOnly?: boolean; // Add this
}

export function FulfillmentCenter({
  currentUser,
  invoices = [],
  suppliers = [],
  purchaseOrders = [],
  dispatchOrders = [],
  fieldReps = [],
  onAction,
  onRefresh,
  readOnly = false // Add this with default
}: FulfillmentCenterProps) {
  
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [dispatchInvoice, setDispatchInvoice] = useState<Invoice | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // Add search state

  const invoicesWithFulfillmentStatus = useMemo(() => {
    return invoices.map(invoice => {
      const relatedDispatchItems = dispatchOrders.filter(d => d.invoiceId === invoice.invoiceId);
      
      let fulfillmentStatus = 'AWAITING_FULFILLMENT';
      
      if (relatedDispatchItems.length > 0) {
        if (relatedDispatchItems.some(d => d.dispatchApprovalStatus === 'Pending Approval')) {
          fulfillmentStatus = 'PENDING_APPROVAL';
        } 
        else if (relatedDispatchItems.every(d => d.dispatchApprovalStatus === 'Approved')) {
          fulfillmentStatus = 'READY_FOR_DISPATCH';
        }
        else if (relatedDispatchItems.every(d => d.dispatchApprovalStatus === 'Rejected')) {
          fulfillmentStatus = 'AWAITING_FULFILLMENT';
        }
      }
      
      return { ...invoice, fulfillmentStatus, dispatchItems: relatedDispatchItems };
    });
  }, [invoices, dispatchOrders]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "AWAITING_FULFILLMENT":
        return { 
          icon: Clock, 
          color: "text-amber-600", 
          bg: "bg-amber-50", 
          border: "border-amber-200",
          label: "Awaiting Fulfillment"
        };
      case "PENDING_APPROVAL":
        return { 
          icon: Package, 
          color: "text-blue-600", 
          bg: "bg-blue-50", 
          border: "border-blue-200",
          label: "Pending Approval"
        };
      case "READY_FOR_DISPATCH":
        return { 
          icon: Truck, 
          color: "text-emerald-600", 
          bg: "bg-emerald-50", 
          border: "border-emerald-200",
          label: "Ready for Dispatch"
        };
      case "DISPATCHED":
        return { 
          icon: CheckCircle, 
          color: "text-green-600", 
          bg: "bg-green-50", 
          border: "border-green-200",
          label: "Dispatched"
        };
      default:
        return { 
          icon: Clock, 
          color: "text-gray-600", 
          bg: "bg-gray-50", 
          border: "border-gray-200",
          label: "Unknown"
        };
    }
  };

  const handleInvoiceClick = (invoice) => {
    if (readOnly) {
      // In read-only mode, just show details but don't allow actions
      setSelectedInvoice(invoice);
      return;
    }
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

  // Filter invoices based on search term (for pending and completed tabs)
  const filterInvoices = (invoices: any[]) => {
    if (!searchTerm.trim()) return invoices;
    
    const term = searchTerm.toLowerCase();
    return invoices.filter(invoice => {
      const matchesId = String(invoice.invoiceId || '').toLowerCase().includes(term);
      const matchesCustomer = String(invoice.customerName || '').toLowerCase().includes(term);
      const matchesPhone = String(invoice.customerPhone || '').toLowerCase().includes(term);
      
      return matchesId || matchesCustomer || matchesPhone;
    });
  };

  const pendingInvoices = useMemo(() => {
    const filtered = invoicesWithFulfillmentStatus.filter(inv => 
      inv.fulfillmentStatus === 'AWAITING_FULFILLMENT' || inv.fulfillmentStatus === 'PENDING_APPROVAL'
    );
    return filterInvoices(filtered);
  }, [invoicesWithFulfillmentStatus, searchTerm]);

  const completedInvoices = useMemo(() => {
    const filtered = invoicesWithFulfillmentStatus.filter(inv => 
      inv.fulfillmentStatus === 'READY_FOR_DISPATCH' || inv.fulfillmentStatus === 'DISPATCHED'
    );
    return filterInvoices(filtered);
  }, [invoicesWithFulfillmentStatus, searchTerm]);

  // Reset search when switching tabs
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchTerm(''); // Clear search when switching tabs
  };

  // Pagination per tab
  const pendingPagination = usePagination({ totalItems: pendingInvoices.length, initialPage: 1, initialPageSize: 9 });
  const completedPagination = usePagination({ totalItems: completedInvoices.length, initialPage: 1, initialPageSize: 9 });
  const paginatedPending = useMemo(() => {
    const [start, end] = pendingPagination.slice;
    return pendingInvoices.slice(start, end);
  }, [pendingInvoices, pendingPagination.slice]);
  const paginatedCompleted = useMemo(() => {
    const [start, end] = completedPagination.slice;
    return completedInvoices.slice(start, end);
  }, [completedInvoices, completedPagination.slice]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        // Fallback: try to refresh through onAction if onRefresh is not provided
        await onAction('getData', {});
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        
        {/* Modern Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Fulfillment Center</h1>
              <p className="text-slate-600">Manage inventory fulfillment and dispatch operations</p>
            </div>
            <Button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>
        </div>

        {/* Stats Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending Orders</p>
                <p className="text-2xl font-semibold text-slate-900">{pendingInvoices.length}</p>
              </div>
              <div className="h-10 w-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Awaiting Approval</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {pendingInvoices.filter(inv => inv.fulfillmentStatus === 'PENDING_APPROVAL').length}
                </p>
              </div>
              <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Dispatched</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {completedInvoices.filter(inv => inv.fulfillmentStatus === 'READY_FOR_DISPATCH').length}
                </p>
              </div>
              <div className="h-10 w-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Truck className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Completed</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {completedInvoices.filter(inv => inv.fulfillmentStatus === 'DISPATCHED').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className={`grid w-full ${readOnly ? 'grid-cols-3' : 'grid-cols-4'} bg-white border border-slate-200 rounded-xl p-1`}>
            <TabsTrigger 
              value="pending" 
              className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              Pending Orders
            </TabsTrigger>
            {!readOnly && (
              <TabsTrigger 
                value="outsourced" 
                className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white"
              >
                Outsourced Items
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="completed" 
              className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              Completed
            </TabsTrigger>
            <TabsTrigger 
              value="stock" 
              className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              Stock Management
            </TabsTrigger>
          </TabsList>

          {/* Search Input - placed above tab content - Hide for Stock Management tab */}
          {activeTab !== 'stock' && (
            <div className="mt-6 mb-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={
                    activeTab === 'outsourced' 
                      ? "Search by PO ID, Supplier, Product, or Invoice ID..."
                      : "Search by Invoice ID, Customer Name, or Phone..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>
              {searchTerm && (
                <p className="text-sm text-muted-foreground mt-2">
                  {activeTab === 'pending' && `Found ${pendingInvoices.length} result${pendingInvoices.length !== 1 ? 's' : ''}`}
                  {activeTab === 'completed' && `Found ${completedInvoices.length} result${completedInvoices.length !== 1 ? 's' : ''}`}
                </p>
              )}
            </div>
          )}

          <TabsContent value="pending" className="space-y-6 mt-6">
            {pendingInvoices.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {paginatedPending.map((invoice) => {
                  const statusConfig = getStatusConfig(invoice.fulfillmentStatus);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <Card 
                      key={invoice.invoiceId} 
                      className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-slate-200 hover:border-slate-300"
                      onClick={() => handleInvoiceClick(invoice)}
                    >
                      <CardContent className="p-6">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-slate-900 text-lg">{invoice.invoiceId}</h3>
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-2 ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border`}>
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </div>
                          </div>
                        </div>

                        {/* Customer Info */}
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <User className="h-4 w-4" />
                            <span className="font-medium">{invoice.customerName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500">
                            <Phone className="h-4 w-4" />
                            <span className="text-sm">{invoice.customerPhone}</span>
                          </div>
                        </div>

                        {/* Order Details */}
                        <div className="flex items-center justify-between py-3 border-t border-slate-100">
                          <div className="text-sm text-slate-600">
                            <span className="font-medium">{invoice.lineItems.length}</span> items
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-slate-900">
                              KSh {invoice.totalAmount.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <Button 
                          className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white group-hover:bg-slate-800 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInvoiceClick(invoice);
                          }}
                          disabled={readOnly} // Add this
                        >
                          {readOnly ? "View Details" : invoice.fulfillmentStatus === "AWAITING_FULFILLMENT" ? "Assign Fulfillment" : "Pending Approval"}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-slate-200">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Package className="h-6 w-6 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">No pending orders</h3>
                  <p className="text-slate-500 text-center">All orders have been processed and are ready for dispatch.</p>
                </CardContent>
              </Card>
            )}
            {pendingInvoices.length > 0 ? (
              <div className="pt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => { e.preventDefault(); pendingPagination.setPage(Math.max(1, pendingPagination.page - 1)); }}
                      />
                    </PaginationItem>
                    {Array.from({ length: pendingPagination.totalPages }, (_, i) => i + 1)
                      .slice(Math.max(0, pendingPagination.page - 3), Math.max(0, pendingPagination.page - 3) + 5)
                      .map((n) => (
                        <PaginationItem key={`pending-${n}`}>
                          <PaginationLink
                            href="#"
                            isActive={n === pendingPagination.page}
                            onClick={(e) => { e.preventDefault(); pendingPagination.setPage(n); }}
                          >
                            {n}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => { e.preventDefault(); pendingPagination.setPage(Math.min(pendingPagination.totalPages, pendingPagination.page + 1)); }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="outsourced" className="space-y-6 mt-6">
            <OutsourcedItemsHub 
              purchaseOrders={purchaseOrders} 
              onAction={onAction} 
              currentUser={currentUser}
              searchTerm={searchTerm} // Pass search term to OutsourcedItemsHub
            />
          </TabsContent>

          <TabsContent value="completed" className="space-y-6 mt-6">
            {completedInvoices.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {paginatedCompleted.map((invoice) => {
                  const statusConfig = getStatusConfig(invoice.fulfillmentStatus);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <Card key={invoice.invoiceId} className="border-slate-200 opacity-75">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-slate-900 text-lg">{invoice.invoiceId}</h3>
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-2 ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border`}>
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 mb-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <User className="h-4 w-4" />
                            <span className="font-medium">{invoice.customerName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500">
                            <Phone className="h-4 w-4" />
                            <span className="text-sm">{invoice.customerPhone}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between py-3 border-t border-slate-100">
                          <div className="text-sm text-slate-600">
                            <span className="font-medium">{invoice.lineItems.length}</span> items
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-slate-900">
                              KSh {invoice.totalAmount.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-slate-200">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-6 w-6 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">No completed orders</h3>
                  <p className="text-slate-500 text-center">Completed orders will appear here once they are dispatched.</p>
                </CardContent>
              </Card>
            )}
            {completedInvoices.length > 0 && (
              <div className="pt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => { e.preventDefault(); completedPagination.setPage(Math.max(1, completedPagination.page - 1)); }}
                      />
                    </PaginationItem>
                    {Array.from({ length: completedPagination.totalPages }, (_, i) => i + 1)
                      .slice(Math.max(0, completedPagination.page - 3), Math.max(0, completedPagination.page - 3) + 5)
                      .map((n) => (
                        <PaginationItem key={`completed-${n}`}>
                          <PaginationLink
                            href="#"
                            isActive={n === completedPagination.page}
                            onClick={(e) => { e.preventDefault(); completedPagination.setPage(n); }}
                          >
                            {n}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => { e.preventDefault(); completedPagination.setPage(Math.min(completedPagination.totalPages, completedPagination.page + 1)); }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </TabsContent>

          <TabsContent value="stock" className="space-y-6 mt-6">
            <StockManagement 
              currentUser={currentUser}
              fieldReps={fieldReps}
              onAction={onAction}
              onRefresh={onRefresh}
              readOnly={readOnly} // Add this
            />
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        {selectedInvoice && (
          <InvoiceAssignmentDialog
            invoice={selectedInvoice}
            suppliers={suppliers}
            purchaseOrders={purchaseOrders}  // Add this
            currentUser={currentUser}        // Add this
            fieldReps={fieldReps}
            onAction={onAction}
            open={!!selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
            readOnly={readOnly} // Add this
          />
        )}

        {dispatchInvoice && (
          <DispatchApprovalDialog
            invoice={dispatchInvoice}
            dispatchItems={dispatchInvoice.dispatchItems}
            open={!!dispatchInvoice}
            onClose={() => setDispatchInvoice(null)}
            onAction={onAction}
            currentUser={currentUser}
            readOnly={readOnly} // Add this
          />
        )}
      </div>
    </div>
  );
}