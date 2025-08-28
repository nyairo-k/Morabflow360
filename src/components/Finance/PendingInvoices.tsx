import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, FileUp, List, Download, Loader2, History, Eye } from "lucide-react"; 

// The interface for a single invoice
export interface Invoice {
  id: string;
  clientName: string;
  totalAmount: string;
  submittedDate: string;
  status: 'Waiting' | 'Uploaded';
  items: any[];
  pdfUrl?: string;
}

// The props the component receives
interface PendingInvoicesProps {
  invoices: Invoice[];
  payments: Payment[];
  onUploadSuccess: () => void;
}


const PaymentStatusBadge = ({ status }: { status: string }) => {
  const statusStyles = {
    'Paid': 'bg-green-100 text-green-800',
    'Partially Paid': 'bg-yellow-100 text-yellow-800',
    'Unpaid': 'bg-red-100 text-red-800',
  };
  return <Badge className={statusStyles[status]}>{status}</Badge>;
};

export function PendingInvoices({ invoices, payments, onUploadSuccess }: PendingInvoicesProps) {
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const invoicesWithPaymentData = useMemo(() => {
    return invoices.map(invoice => {
      const relatedPayments = payments.filter(p => p.invoiceId === invoice.id);
      const totalPaid = relatedPayments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
      const totalAmount = Number(invoice.totalAmount);
      let paymentStatus = 'Unpaid';
      if (totalPaid > 0 && totalAmount > 0) {
        paymentStatus = totalPaid >= totalAmount ? 'Paid' : 'Partially Paid';
      }
      return { ...invoice, payments: relatedPayments, totalPaid, paymentStatus };
    });
  }, [invoices, payments]);
  

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
    
    const backendUrl = "http://localhost:4000/upload-invoice";

    // 5. Call the backend server
    fetch(backendUrl, {
      method: "POST",
      body: formData,
    })
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => { throw new Error(err.message || 'Upload failed') });
      }
      return res.json();
    })
    .then(data => {
      alert("Invoice processed successfully!");
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

   const invoicesToShow = invoicesWithPaymentData.filter(inv => inv.status === 'Waiting' || inv.status === 'Uploaded');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <List className="h-5 w-5" />
          <span>Pending & Uploaded Invoices</span>
          <Badge variant="secondary">{invoicesToShow.length}</Badge>
        </CardTitle>
        <CardDescription>Review requests and upload finalized invoices.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
             <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Invoice ID</TableHead>
              <TableHead>Client</TableHead>
              {/* This column header is updated */}
              <TableHead>Amount (Total vs. Paid)</TableHead> 
              {/* The "Date" column is removed to make space for the new "Payment Status" column */}
              <TableHead>Upload Status</TableHead>
              {/* This is the new column header */}
              <TableHead>Payment Status</TableHead> 
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoicesToShow.map((invoice) => (
              <React.Fragment key={invoice.id}>
                <TableRow>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleExpand(invoice.id)}>
                      {expandedInvoiceId === invoice.id ? <ChevronDown /> : <ChevronRight />}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{invoice.id}</TableCell>
                  <TableCell>{invoice.clientName}</TableCell>
                  
                  {/* ====== 1. ENHANCED "Amount" Column ====== */}
                  <TableCell>
                    Ksh {Number(invoice.totalAmount).toLocaleString()}
                    <p className="text-xs text-green-600 font-semibold">Paid: Ksh {invoice.totalPaid.toLocaleString()}</p>
                  </TableCell>

                  {/* This is the original "Status" column, renamed for clarity */}
                  <TableCell>
                    <Badge variant={invoice.status === 'Uploaded' ? 'secondary' : 'outline'}>
                      {invoice.status}
                    </Badge>
                  </TableCell>

                  {/* ====== 2. NEW "Payment Status" Column ====== */}
                  <TableCell>
                    <PaymentStatusBadge status={invoice.paymentStatus} />
                  </TableCell>

                  <TableCell className="text-right flex justify-end gap-2">
                    {/* ====== 3. NEW "Payment History" Button ====== */}
                    {invoice.payments.filter(p => p.amountPaid > 0).length > 0 && (
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
                                </div>
                                {p.paymentImageUrl && <Button asChild size="icon" variant="ghost"><a href={p.paymentImageUrl} target="_blank"><Eye /></a></Button>}
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    
                    {/* This is your original, working button logic, now with the History button alongside it */}
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
                    {/* The colSpan is updated to match the new number of columns */}
                    <TableCell colSpan={7} className="p-0">
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
      </CardContent>
    </Card>
  );
}