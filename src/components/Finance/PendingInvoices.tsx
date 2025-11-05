import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, FileUp, List, Download, Loader2, History, Eye, CheckCircle, Clock, Search, Phone } from "lucide-react"; 
import { toast } from "sonner";
import { cfg } from "@/lib/config";
import { usePagination } from "@/hooks/use-pagination";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";

// The interface for a single invoice
export interface Invoice {
  id: string;
  clientName: string;
  customerPhone?: string; // Add this line
  totalAmount: string;
  submittedDate: string;
  status: 'Waiting' | 'Uploaded';
  items: any[];
  pdfUrl?: string;
}

// Payment record associated with an invoice
export interface Payment {
  paymentId: string;
  invoiceId: string;
  paymentDate: string;
  amountPaid: string | number;
  loggedBy: string;
  mpesaCode: string;
  paymentImageUrl?: string;
  paymentConfirmed?: boolean;
}

// The props the component receives
interface PendingInvoicesProps {
  invoices: Invoice[];
  payments: Payment[];
  onUploadSuccess: () => void;
  onConfirmPayment?: (paymentId: string) => Promise<void>;
  currentUser?: any;
}

const PaymentStatusBadge = ({ status }: { status: string }) => {
  const statusStyles = {
    'Paid': 'bg-green-100 text-green-800',
    'Partially Paid': 'bg-yellow-100 text-yellow-800',
    'Unpaid': 'bg-red-100 text-red-800',
  };
  return <Badge className={statusStyles[status]}>{status}</Badge>;
};

export function PendingInvoices({ invoices, payments, onUploadSuccess, onConfirmPayment, currentUser }: PendingInvoicesProps) {
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [uploadFilter, setUploadFilter] = useState<'all' | 'Waiting' | 'Uploaded'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'Paid' | 'Partially Paid' | 'Unpaid'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const invoicesWithPaymentData = useMemo(() => {
    return invoices.map(invoice => {
      const relatedPayments = payments.filter(p => p.invoiceId === invoice.id);
      const totalPaid = relatedPayments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
      const totalAmount = Number(invoice.totalAmount);
      let paymentStatus = 'Unpaid';
      if (totalPaid > 0 && totalAmount > 0) {
        paymentStatus = totalPaid >= totalAmount ? 'Paid' : 'Partially Paid';
      }
      
      // Check if payment is confirmed by Finance
      const hasConfirmedPayment = relatedPayments.some(p => p.paymentConfirmed === true);
      
      return { 
        ...invoice, 
        payments: relatedPayments, 
        totalPaid, 
        paymentStatus,
        hasConfirmedPayment 
      };
    });
  }, [invoices, payments]);

  // Add function to handle payment confirmation
  const handleConfirmPayment = async (invoiceId: string) => {
    if (!currentUser || currentUser.role !== "Finance") {
      toast.error("Only Finance users can confirm payments");
      return;
    }

    // Find the latest payment for this invoice
    const relatedPayments = payments.filter(p => p.invoiceId === invoiceId);
    const latestPayment = relatedPayments[relatedPayments.length - 1];
    
    if (!latestPayment) {
      toast.error("No payment found to confirm");
      return;
    }

    // Call the parent function to handle confirmation
    if (onConfirmPayment) {
      await onConfirmPayment(latestPayment.paymentId);
    }
  };

  const handleToggleExpand = (invoiceId: string) => {
    setExpandedInvoiceId(prevId => (prevId === invoiceId ? null : invoiceId));
  };

  const handleFileUpload = (invoiceId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    // 1. Get the file from the browser event.
    const file = event.target.files?.[0];

    // 2. Add a safeguard.
    if (!file) {
      return;
    }

    // 3. Set the loading state for the UI
    setIsUploading(invoiceId);

    // 4. Prepare the data package to send to the server
    const formData = new FormData();
    formData.append("file", file);
    formData.append("invoiceId", invoiceId);
    
    const backendUrl = `${cfg.apiBase}/upload-invoice`;

    // 5. Call the backend server
    fetch(backendUrl, {
      method: "POST",
      body: formData,
    })
    .then(async res => {
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Upload failed');
      }
      return res.json();
    })
    .then(data => {
      alert("Invoice processed successfully!");
      
      // NEW: Create dispatch order entry for fulfillment
      const INV_SCRIPT_URL = cfg.inventoryScript;
      
      return fetch(INV_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'logInvoiceForFulfillment',
          data: { invoiceId: invoiceId }
        })
      });
    })
    .then(() => {
      onUploadSuccess(); // Call the parent's refresh function
    })
    .catch(error => {
      console.error("Upload process error:", error);
      alert(`An error occurred: ${error.message}`);
    })
    .finally(() => {
      setIsUploading(null);
    });
  }; 

  // Apply filters including search
  const filteredInvoices = useMemo(() => {
    let result = invoicesWithPaymentData
      .filter(inv => (uploadFilter === 'all' ? true : inv.status === uploadFilter))
      .filter(inv => (paymentFilter === 'all' ? true : inv.paymentStatus === paymentFilter));

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(invoice => {
        // Search in ID
        const matchesId = (invoice.id || '').toLowerCase().includes(term);
        // Search in client name
        const matchesClient = (invoice.clientName || '').toLowerCase().includes(term);
        // Search in product names from items
        const items = typeof invoice.items === 'string' && invoice.items 
          ? JSON.parse(invoice.items) 
          : invoice.items || [];
        const matchesProducts = items.some((item: any) => 
          (item.productName || '').toLowerCase().includes(term)
        );
        
        return matchesId || matchesClient || matchesProducts;
      });
    }

    return result;
  }, [invoicesWithPaymentData, uploadFilter, paymentFilter, searchTerm]);

  const invoicesToShow = filteredInvoices.filter(inv => inv.status === 'Waiting' || inv.status === 'Uploaded');
  const { page, totalPages, setPage, slice } = usePagination({ totalItems: invoicesToShow.length, initialPage: 1, initialPageSize: 10 });
  const paginatedInvoices = useMemo(() => {
    const [start, end] = slice;
    return invoicesToShow.slice(start, end);
  }, [invoicesToShow, slice]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <List className="h-5 w-5" />
          <span>Pending & Uploaded Invoices</span>
          <Badge variant="secondary">{invoicesToShow.length}</Badge>
        </CardTitle>
        <CardDescription>Review requests and upload finalized invoices.</CardDescription>
        <div className="mt-3 flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Upload Status</span>
            <Select value={uploadFilter} onValueChange={(v) => setUploadFilter(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Upload Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Waiting">Waiting</SelectItem>
                <SelectItem value="Uploaded">Uploaded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Payment Status</span>
            <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as any)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                <SelectItem value="Unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Invoice ID, Client, or Product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          {searchTerm && (
            <p className="text-sm text-muted-foreground mt-2">
              Found {invoicesToShow.length} result{invoicesToShow.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
             <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Invoice ID</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Amount (Total vs. Paid)</TableHead> 
              <TableHead>Upload Status</TableHead>
              <TableHead>Payment Status</TableHead> 
              <TableHead>Confirmation</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedInvoices.map((invoice) => (
              <React.Fragment key={invoice.id}>
                <TableRow>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleExpand(invoice.id)}>
                      {expandedInvoiceId === invoice.id ? <ChevronDown /> : <ChevronRight />}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{invoice.id}</TableCell>
                  <TableCell>
                    {invoice.clientName}
                    {invoice.customerPhone && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {invoice.customerPhone}
                      </p>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    Ksh {Number(invoice.totalAmount).toLocaleString()}
                    <p className="text-xs text-green-600 font-semibold">Paid: Ksh {invoice.totalPaid.toLocaleString()}</p>
                  </TableCell>

                  <TableCell>
                    <Badge variant={invoice.status === 'Uploaded' ? 'secondary' : 'outline'}>
                      {invoice.status}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <PaymentStatusBadge status={invoice.paymentStatus} />
                  </TableCell>

                  <TableCell>
                    {(invoice.paymentStatus === 'Paid' || invoice.paymentStatus === 'Partially Paid') && invoice.payments.length > 0 ? (
                      invoice.hasConfirmedPayment ? (
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-xs">Confirmed</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-orange-600">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs">Pending</span>
                        </div>
                      )
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right flex justify-end gap-2">
                    {invoice.payments.filter(p => Number(p.amountPaid) > 0).length > 0 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="icon" variant="outline" title="View Payment History">
                            <History className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Payment History for {invoice.id}</DialogTitle></DialogHeader>
                          <div className="space-y-2 max-h-[60vh] overflow-y-auto p-1">
                            {invoice.payments.filter(p => p.mpesaCode !== "Initial Record").map(p => (
                              <div key={p.paymentId} className="flex justify-between items-center p-2 border rounded-md">
                                <div>
                                  <p>Ksh {Number(p.amountPaid).toLocaleString()} on {new Date(p.paymentDate).toLocaleDateString()}</p>
                                  <p className="text-xs text-muted-foreground">Logged by {p.loggedBy} (Code: {p.mpesaCode})</p>
                                  {p.paymentConfirmed ? (
                                    <p className="text-xs text-green-600">✓ Confirmed by Finance</p>
                                  ) : (
                                    <p className="text-xs text-orange-600">⏳ Pending Finance confirmation</p>
                                  )}
                                </div>
                                <div className="flex flex-col space-y-1">
                                  {p.paymentImageUrl && <Button asChild size="icon" variant="ghost"><a href={p.paymentImageUrl} target="_blank"><Eye /></a></Button>}
                                  {currentUser?.role === "Finance" && !p.paymentConfirmed && (
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="text-green-600 border-green-600 hover:bg-green-50"
                                      onClick={() => handleConfirmPayment(invoice.id)}
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Confirm
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    
                    {isUploading === invoice.id ? (
                       <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    ) : invoice.pdfUrl ? (
                      <Button asChild variant="default" size="sm">
                        <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" /> Download
                        </a>
                      </Button>
                    ) : (
                      <Button asChild variant="outline" size="sm">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <FileUp className="h-4 w-4" />
                          <span>Upload PDF</span>
                          <input type="file" className="hidden" accept="application/pdf" onChange={(e) => handleFileUpload(invoice.id, e)} />
                        </label>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                {expandedInvoiceId === invoice.id && (
                  <TableRow key={`${invoice.id}-details`}>
                    <TableCell colSpan={8} className="p-0">
                      <div className="p-4 bg-muted">
                        <h4 className="font-semibold mb-2">Requested Items:</h4>
                        <div className="space-y-1 pl-4">
                          {(typeof invoice.items === 'string' && invoice.items ? JSON.parse(invoice.items) : invoice.items || []).map((item: any, index: number) => (
                            <div key={index} className="grid grid-cols-3 gap-4 text-sm">
                              <span>- {item.productName}</span>
                              <span>Qty: {item.quantity}</span>
                              <span>Price: Ksh {Number(item.unitPrice).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
        <div className="pt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage(Math.max(1, page - 1)); }} />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, page - 3), Math.max(0, page - 3) + 5)
                .map((n) => (
                  <PaginationItem key={n}>
                    <PaginationLink href="#" isActive={n === page} onClick={(e) => { e.preventDefault(); setPage(n); }}>
                      {n}
                    </PaginationLink>
                  </PaginationItem>
                ))}
              <PaginationItem>
                <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage(Math.min(totalPages, page + 1)); }} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </CardContent>
    </Card>
  );
}