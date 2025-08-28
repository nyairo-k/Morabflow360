import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight, ListChecks, Download, DollarSign, History, Eye } from "lucide-react";
import { toast } from "sonner";
import { User } from "@/types/requisition";

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
}

// --- DEFINE PROPS ---
interface InvoicesListProps {
  invoices: Invoice[];
  payments: Payment[];
  onLogPayment: (paymentData: any, imageFile: File | null) => void;
  currentUser: User;
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


export function InvoicesList({ invoices = [], payments = [], onLogPayment, currentUser }: InvoicesListProps) {
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [paymentImageFile, setPaymentImageFile] = useState<File | null>(null);
  const [amountPaid, setAmountPaid] = useState('');
  const [mpesaCode, setMpesaCode] = useState('');

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
      return { ...invoice, payments: relatedPayments, totalPaid, paymentStatus };
    });
  }, [invoices, payments]);

  const handleSubmitPayment = (invoiceId: string) => {
    if (!amountPaid || Number(amountPaid) <= 0) {
      toast.error("Please enter a valid amount paid.");
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
        <CardTitle className="flex items-center space-x-2">
            <ListChecks className="h-5 w-5" />
            <span>Invoice Payment Tracking</span>
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
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoicesWithPaymentData.map((invoice) => (
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
                                </div>
                                {p.paymentImageUrl && <Button asChild size="icon" variant="ghost"><a href={p.paymentImageUrl} target="_blank"><Eye /></a></Button>}
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
                              <Label htmlFor="paymentImage" className="text-right">Image/Proof</Label>
                              <Input id="paymentImage" type="file" onChange={(e) => setPaymentImageFile(e.target.files?.[0] || null)} className="col-span-3" />
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
                    <TableCell colSpan={7}>
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
      </CardContent>
    </Card>
  );
}