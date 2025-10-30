import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight, ListChecks, Download, DollarSign, History, Eye, RefreshCw, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { User } from "@/types/requisition";
import { usePagination } from "@/hooks/use-pagination";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";

// --- DEFINE DATA STRUCTURES ---
export interface Invoice {
  id: string;
  clientName: string;
  totalAmount: string;
  status: 'Waiting' | 'Uploaded';
  submittedDate: string;
  items: any;
  pdfUrl?: string;
}
export interface Payment {
  paymentId: string;
  invoiceId: string;
  paymentDate: string;
  amountPaid: string;
  loggedBy: string;
  mpesaCode: string;
  paymentImageUrl: string;
  paymentConfirmed?: boolean; // Add this field
}

// --- DEFINE PROPS ---
interface InvoicesListProps {
  invoices: Invoice[];
  payments: Payment[];
  onLogPayment: (paymentData: any, imageFile: File | null) => void;
  onConfirmPayment?: (paymentId: string) => Promise<void>; // ADD THIS
  currentUser: User;
  onRefresh?: () => void;
}

// --- HELPER COMPONENT ---
const PaymentStatusBadge = ({ status }: { status: string }) => {
  const statusStyles = {
    'Paid': 'bg-green-100 text-green-800',
    'Partially Paid': 'bg-yellow-100 text-yellow-800',
    'Unpaid': 'bg-red-100 text-red-800',
  };
  return <Badge className={statusStyles[status]}>{status}</Badge>;
};


export function InvoicesList({ invoices = [], payments = [], onLogPayment, onConfirmPayment, currentUser, onRefresh }: InvoicesListProps) {
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [paymentImageFile, setPaymentImageFile] = useState<File | null>(null);
  const [amountPaid, setAmountPaid] = useState('');
  const [mpesaCode, setMpesaCode] = useState('');

  // Some user objects may not have a strict role union including "Finance"; use a safe check
  const isFinanceUser = String((currentUser as any)?.role) === "Finance";

  const handleToggleExpand = (invoiceId: string) => {
    setExpandedInvoiceId(prevId => (prevId === invoiceId ? null : invoiceId));
  };

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

  const { page, totalPages, setPage, slice } = usePagination({ totalItems: invoicesWithPaymentData.length, initialPage: 1, initialPageSize: 10 });
  const paginatedInvoices = useMemo(() => {
    const [start, end] = slice;
    return invoicesWithPaymentData.slice(start, end);
  }, [invoicesWithPaymentData, slice]);

  // Add function to handle payment confirmation
  const handleConfirmPayment = async (invoiceId: string) => {
    if (!currentUser || !isFinanceUser) {
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

  const handleSubmitPayment = (invoiceId: string) => {
    if (!amountPaid || Number(amountPaid) <= 0) {
      toast.error("Please enter a valid amount paid.");
      return;
    }
    if (!paymentImageFile) {
      toast.error("Please attach an image/proof of payment.");
      return;
    }
    if (!currentUser) {
      toast.error("Error: User not identified. Please try again.");
      return;
    }
    
    onLogPayment({
      invoiceId: invoiceId,
      amountPaid: amountPaid,
      mpesaCode: mpesaCode,
      loggedBy: currentUser.name,
    }, paymentImageFile);

    setAmountPaid('');
    setMpesaCode('');
    setPaymentImageFile(null);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ListChecks className="h-5 w-5" />
            <span>Invoice Payment Tracking</span>
          </div>
          {onRefresh && (
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
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead />
              <TableHead>Invoice ID</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead>Confirmation</TableHead> {/* NEW COLUMN */}
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedInvoices.map((invoice) => (
              <>
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleExpand(invoice.id)}>
                      {expandedInvoiceId === invoice.id ? <ChevronDown /> : <ChevronRight />}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{invoice.id}</TableCell>
                  <TableCell>{invoice.clientName}</TableCell>
                  <TableCell>
                    Ksh {Number(invoice.totalAmount).toLocaleString()}
                    <p className="text-xs text-green-600">Paid: Ksh {invoice.totalPaid.toLocaleString()}</p>
                  </TableCell>
                  <TableCell><PaymentStatusBadge status={invoice.paymentStatus} /></TableCell>
                  
                  {/* NEW CONFIRMATION COLUMN */}
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
                  
                  <TableCell>{invoice.submittedDate ? new Date(invoice.submittedDate).toLocaleDateString() : 'Invalid Date'}</TableCell>
                  <TableCell className="text-right flex justify-end gap-2">
                    {invoice.pdfUrl && <Button asChild size="icon" variant="outline"><a href={invoice.pdfUrl} target="_blank"><Download /></a></Button>}
                    {invoice.payments.length > 0 && (
                      <Dialog>
                        <DialogTrigger asChild><Button size="icon" variant="outline"><History /></Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Payment History for {invoice.id}</DialogTitle></DialogHeader>
                          <div className="space-y-2 max-h-[60vh] overflow-y-auto p-1">
                            {invoice.payments.filter(p => p.mpesaCode !== "Initial Record").map(p => (
                              <div key={p.paymentId} className="flex justify-between items-center p-2 border rounded-md">
                                <div>
                                  <p>Ksh {Number(p.amountPaid).toLocaleString()} on {new Date(p.paymentDate).toLocaleDateString()}</p>
                                  <p className="text-xs text-muted-foreground">Logged by {p.loggedBy} (Code: {p.mpesaCode})</p>
                                  {/* Show confirmation status */}
                                  {p.paymentConfirmed ? (
                                    <p className="text-xs text-green-600">✓ Confirmed by Finance</p>
                                  ) : (
                                    <p className="text-xs text-orange-600">⏳ Pending Finance confirmation</p>
                                  )}
                                </div>
                                <div className="flex flex-col space-y-1">
                                  {p.paymentImageUrl && <Button asChild size="icon" variant="ghost"><a href={p.paymentImageUrl} target="_blank"><Eye /></a></Button>}
                                  {/* Add confirm button for Finance users */}
                                  {isFinanceUser && !p.paymentConfirmed && (
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
                    {invoice.paymentStatus !== 'Paid' && (
                      <Dialog onOpenChange={() => { setAmountPaid(''); setMpesaCode(''); setPaymentImageFile(null); }}>
                        <DialogTrigger asChild>
                          <Button size="icon" className="bg-blue-600 hover:bg-blue-700 text-white"><DollarSign className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Log Payment for {invoice.id}</DialogTitle></DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="amountPaid" className="text-right">Amount Paid</Label>
                              <Input id="amountPaid" type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="col-span-3" placeholder="e.g., 5000" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="mpesaCode" className="text-right">Mpesa Code</Label>
                              <Input id="mpesaCode" value={mpesaCode} onChange={(e) => setMpesaCode(e.target.value)} className="col-span-3" placeholder="e.g., RKI4..." />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="paymentImage" className="text-right">Image/Proof *</Label>
                              <Input id="paymentImage" type="file" accept="image/*"
                                onChange={(e) => setPaymentImageFile(e.target.files?.[0] || null)} className="col-span-3" />
                            </div>
                          </div>
                          <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                            <DialogClose asChild><Button type="submit" onClick={() => handleSubmitPayment(invoice.id)}>Submit Payment</Button></DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </TableCell>
                </TableRow>
                
                {/* The expandable row is a sibling to the main TableRow */}
                {expandedInvoiceId === invoice.id && (
                  <TableRow key={`${invoice.id}-details`}>
                    <TableCell colSpan={8}>
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
              </>
            ))}
          </TableBody>
        </Table>
        <div className="pt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage(Math.max(1, page - 1)); }}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, page - 3), Math.max(0, page - 3) + 5)
                .map((n) => (
                  <PaginationItem key={n}>
                    <PaginationLink
                      href="#"
                      isActive={n === page}
                      onClick={(e) => { e.preventDefault(); setPage(n); }}
                    >
                      {n}
                    </PaginationLink>
                  </PaginationItem>
                ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage(Math.min(totalPages, page + 1)); }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </CardContent>
    </Card>
  );
}