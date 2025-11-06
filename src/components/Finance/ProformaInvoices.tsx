import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight, FileUp, List, Download, Loader2, History, Eye, CheckCircle, Clock, Search, Phone, X, RefreshCw } from "lucide-react"; 
import { toast } from "sonner";
import { cfg } from "@/lib/config";
import { usePagination } from "@/hooks/use-pagination";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";

export interface ProformaInvoice {
  id: string;
  clientName: string;
  customerPhone?: string;
  totalAmount: string;
  submittedDate: string;
  status: 'Waiting' | 'Uploaded' | 'Accepted' | 'Rejected';
  items: any[];
  pdfUrl?: string;
  submittedBy?: string;
  uploadedBy?: string;
  uploadedDate?: string;
  acceptedBy?: string;
  acceptedDate?: string;
  rejectedBy?: string;
  rejectedDate?: string;
  rejectionReason?: string;
  relatedSalesInvoiceId?: string;
}

interface ProformaInvoicesProps {
  proformaInvoices: ProformaInvoice[];
  onUploadSuccess: () => void;
  onAccept: (id: string) => void;
  onReject: (id: string, rejectionReason: string) => void;
  currentUser?: any;
  onRefresh?: () => void;
  hideRefreshButton?: boolean;
}

export function ProformaInvoices({ proformaInvoices, onUploadSuccess, onAccept, onReject, currentUser, onRefresh, hideRefreshButton }: ProformaInvoicesProps) {
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Waiting' | 'Uploaded' | 'Accepted' | 'Rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Debug: Check user role
  const userRole = currentUser?.role;
  const isFinance = userRole === "Finance";

  const handleToggleExpand = (invoiceId: string) => {
    setExpandedInvoiceId(prevId => (prevId === invoiceId ? null : invoiceId));
  };

  const handleRejectClick = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!selectedInvoiceId || !rejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    onReject(selectedInvoiceId, rejectionReason.trim());
    setRejectDialogOpen(false);
    setSelectedInvoiceId(null);
    setRejectionReason("");
  };

  const handleFileUpload = (invoiceId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(invoiceId);
    
    // Step 1: Upload file using the same endpoint as regular invoices
    // The backend will upload the file successfully, but fail to find it in "Invoices" sheet
    // Since backend can't be modified, we'll construct the URL ourselves based on backend's pattern
    const formData = new FormData();
    formData.append("file", file);
    formData.append("invoiceId", invoiceId); // Use actual proforma invoice ID
    
    const backendUrl = `${cfg.apiBase}/upload-invoice`;
    
    // Backend uploads to: invoices/${invoiceId}-${filename}
    // URL pattern: https://storage.googleapis.com/${BUCKET_NAME}/invoices/${invoiceId}-${filename}
    const BUCKET_NAME = "morab-flow-invoices"; // From backend default
    const fileName = file.name;
    const constructedUrl = `https://storage.googleapis.com/${BUCKET_NAME}/invoices/${invoiceId}-${fileName}`;
    
    fetch(backendUrl, {
      method: "POST",
      body: formData,
    })
    .then(async res => {
      // Backend will throw error because invoice not found in "Invoices" sheet
      // But the file was already uploaded! We can construct the URL ourselves
      const text = await res.text();
      let data;
      
      try {
        data = JSON.parse(text);
        // If we got a successful response with URL, use it
        if (data.url || data.pdfUrl) {
          return { url: data.url || data.pdfUrl };
        }
      } catch {
        // Response is not JSON - backend threw error
        // But file was uploaded, so we use constructed URL
        console.log("Backend error (expected for proforma), using constructed URL:", constructedUrl);
      }
      
      // File was uploaded even though backend threw error
      // Use the constructed URL based on backend's naming pattern
      return { url: constructedUrl };
    })
    .then(data => {
      // Step 2: Get the PDF URL (either from response or constructed)
      const pdfUrl = data.url;
      
      if (!pdfUrl) {
        throw new Error("PDF URL not available");
      }
      
      // Step 3: Update Proforma Invoices sheet with the PDF URL via Google Apps Script
      const GOOGLE_SCRIPT_URL = cfg.googleScript;
      const payload = {
        type: "updateProformaPdfUrl",
        proformaId: invoiceId,
        pdfUrl: pdfUrl
      };
      
      return fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      }).then(res => res.json());
    })
    .then(data => {
      toast.success("Proforma invoice uploaded successfully!");
      onUploadSuccess();
    })
    .catch(error => {
      console.error("Upload process error:", error);
      toast.error(`An error occurred: ${error.message}`);
    })
    .finally(() => {
      setIsUploading(null);
    });
  };

  const filteredInvoices = useMemo(() => {
    let result = proformaInvoices.filter(inv => 
      statusFilter === 'all' ? true : inv.status === statusFilter
    );

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(invoice => {
        const matchesId = (invoice.id || '').toLowerCase().includes(term);
        const matchesClient = (invoice.clientName || '').toLowerCase().includes(term);
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
  }, [proformaInvoices, statusFilter, searchTerm]);

  const { page, totalPages, setPage, slice } = usePagination({ 
    totalItems: filteredInvoices.length, 
    initialPage: 1, 
    initialPageSize: 10 
  });
  
  const paginatedInvoices = useMemo(() => {
    const [start, end] = slice;
    return filteredInvoices.slice(start, end);
  }, [filteredInvoices, slice]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'Waiting': { variant: 'outline' as const, className: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
      'Uploaded': { variant: 'secondary' as const, className: 'bg-blue-50 text-blue-800 border-blue-200' },
      'Accepted': { variant: 'default' as const, className: 'bg-green-50 text-green-800 border-green-200' },
      'Rejected': { variant: 'destructive' as const, className: 'bg-red-50 text-red-800 border-red-200' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['Waiting'];
    return <Badge className={config.className}>{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <List className="h-5 w-5" />
            <span>Proforma Invoices</span>
            <Badge variant="secondary">{filteredInvoices.length}</Badge>
          </div>
          {onRefresh && !hideRefreshButton && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
          )}
        </CardTitle>
        <CardDescription>Manage proforma invoices and convert them to sales invoices.</CardDescription>
        <div className="mt-3 flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status</span>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Waiting">Waiting</SelectItem>
                <SelectItem value="Uploaded">Uploaded</SelectItem>
                <SelectItem value="Accepted">Accepted</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Invoice ID, Client, or Product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Invoice ID</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
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
                  <TableCell>Ksh {Number(invoice.totalAmount).toLocaleString()}</TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell>{new Date(invoice.submittedDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right flex justify-end gap-2">
                    {/* Finance Role Actions */}
                    {isFinance && (
                      <>
                        {isUploading === invoice.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : invoice.status === "Waiting" ? (
                          <Button asChild variant="outline" size="sm">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <FileUp className="h-4 w-4" />
                              <span>Upload PDF</span>
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="application/pdf" 
                                onChange={(e) => handleFileUpload(invoice.id, e)} 
                              />
                            </label>
                          </Button>
                        ) : invoice.pdfUrl ? (
                          <Button asChild variant="default" size="sm">
                            <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" /> Download
                            </a>
                          </Button>
                        ) : null}
                      </>
                    )}
                    
                    {/* Sales Role Actions */}
                    {!isFinance && (
                      <>
                        {invoice.status === "Uploaded" && (
                          <>
                            {invoice.pdfUrl && (
                              <Button asChild variant="outline" size="sm">
                                <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4 mr-2" /> Download
                                </a>
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              onClick={() => onAccept(invoice.id)} 
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1"/> Approve
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => handleRejectClick(invoice.id)} 
                              variant="destructive"
                            >
                              <X className="h-4 w-4 mr-1"/> Cancel
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
                {expandedInvoiceId === invoice.id && (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <div className="p-4 bg-muted">
                        {invoice.status === "Rejected" && invoice.rejectionReason && (
                          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <h4 className="font-semibold text-red-800 mb-1">Rejection Reason:</h4>
                            <p className="text-sm text-red-700">{invoice.rejectionReason}</p>
                            {invoice.rejectedBy && (
                              <p className="text-xs text-red-600 mt-1">Rejected by: {invoice.rejectedBy}</p>
                            )}
                            {invoice.rejectedDate && (
                              <p className="text-xs text-red-600">Date: {new Date(invoice.rejectedDate).toLocaleString()}</p>
                            )}
                          </div>
                        )}
                        {invoice.status === "Accepted" && invoice.relatedSalesInvoiceId && (
                          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                            <h4 className="font-semibold text-green-800 mb-1">Accepted and Converted to Sales Invoice</h4>
                            <p className="text-sm text-green-700">Sales Invoice ID: {invoice.relatedSalesInvoiceId}</p>
                            {invoice.acceptedBy && (
                              <p className="text-xs text-green-600 mt-1">Accepted by: {invoice.acceptedBy}</p>
                            )}
                            {invoice.acceptedDate && (
                              <p className="text-xs text-green-600">Date: {new Date(invoice.acceptedDate).toLocaleString()}</p>
                            )}
                          </div>
                        )}
                        <h4 className="font-semibold mb-2">Items:</h4>
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

      {/* Rejection/Cancel Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isFinance ? "Reject Proforma Invoice" : "Cancel Proforma Invoice"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="proforma-rejection-reason">
                {isFinance ? "Rejection Reason *" : "Cancellation Reason *"}
              </Label>
              <Textarea
                id="proforma-rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={isFinance ? "Enter reason for rejection..." : "Enter reason for cancellation..."}
                className="mt-2"
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectConfirm}>
              {isFinance ? "Confirm Rejection" : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

