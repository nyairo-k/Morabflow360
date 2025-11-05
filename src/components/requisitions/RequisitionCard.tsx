import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileText, Calendar, User, Building, DollarSign, Package, Upload, CheckCircle, Eye, AlertTriangle, XCircle, MoreVertical, FileDown, Info, ChevronDown, MessageSquare, Phone } from "lucide-react";
import { User as UserType } from "@/types/requisition";
import { useState } from "react";
import { cn } from "@/lib/utils"; // For dynamic styling
import { cfg } from "@/lib/config";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
// Note: Local StatusBadge component is defined below

// Local UI requisition shape used by this component
interface UIRequisition {
  id: string;
  totalAmount: number;
  items: any[] | string;
  supplierName?: string;
  expenseCategory?: string;
  createdBy: string;
  createdDate: string;
  approvalStatus: 'Pending Approval' | 'Approved' | 'Rejected';
  paymentStatus: 'Unpaid' | 'Paid';
  receiptStatus?: 'Pending' | 'Received';
  approvedBy?: string;
  approvalDate?: string;
  paidBy?: string;
  paymentDate?: string;
  receivedBy?: string;
  receivedDate?: string;
  receiptUrl?: string;
  paymentDetails?: any;
}

interface RequisitionCardProps {
  requisition: UIRequisition;
  currentUser: UserType;
  onAction: (action: string, data: any) => void;
}

// A helper component for the colorful status badge
const StatusBadge = ({ status }: { status: string }) => {
  const statusStyles = {
    'Pending Approval': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Approved': 'bg-blue-100 text-blue-800 border-blue-300',
    'Unpaid': 'bg-orange-100 text-orange-800 border-orange-300',
    'Paid-Awaiting Receipt': 'bg-emerald-50 text-emerald-800 border-emerald-300',
    'Paid': 'bg-green-100 text-green-800 border-green-300',
    'Received': 'bg-gray-100 text-gray-800 border-gray-300',
    'Rejected': 'bg-red-100 text-red-800 border-red-300',
  } as Record<string, string>;
  return <Badge variant="outline" className={cn("font-semibold", statusStyles[status])}>{status}</Badge>;
};


export function RequisitionCard({ requisition, currentUser, onAction }: RequisitionCardProps) {
  const [showItems, setShowItems] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    recipientName: '',
    amountPaid: requisition.totalAmount, // Pre-fill with the total amount
    mpesaCode: '',
    transactionCost: 0,
  });
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receivedItemsNotes, setReceivedItemsNotes] = useState('');
   const [receivedByName, setReceivedByName] = useState('');

  // ----- Download PDF (inline) like Purchase Orders -----
  const ensureHtml2PdfLoaded = async (): Promise<void> => {
    if (typeof window === 'undefined') return;
    if ((window as any).html2pdf) return;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load html2pdf.js'));
      document.body.appendChild(script);
    });
  };

  const handleDownloadPdf = async () => {
    try {
      await ensureHtml2PdfLoaded();
      const items = (typeof requisition.items === 'string' && requisition.items) ? JSON.parse(requisition.items) : requisition.items || [];

      const container = document.createElement('div');
      container.style.width = '210mm';
      container.style.padding = '12mm';
      container.style.background = '#fff';
      container.style.color = '#000';
      const rows = items.map((it: any) => {
        const qty = Number(it.quantity || 0);
        const price = Number(it.unitPrice || 0);
        const total = (qty * price).toLocaleString();
        const name = it.productName || it.name || '-';
        const desc = it.description ? ` - ${it.description}` : '';
        return `<tr><td style="padding:6px;border-bottom:1px solid #f2f2f2">${name}${desc}</td><td style="text-align:right;padding:6px;border-bottom:1px solid #f2f2f2">${qty}</td><td style="text-align:right;padding:6px;border-bottom:1px solid #f2f2f2">${price.toLocaleString()}</td><td style="text-align:right;padding:6px;border-bottom:1px solid #f2f2f2">${total}</td></tr>`;
      }).join('');

      const totalAmount = Number(requisition.totalAmount || 0).toLocaleString();

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ddd;padding-bottom:8px">
          <div><h2 style="margin:0;font-family:ui-sans-serif,system-ui">Requisition</h2><small style="color:#666">Generated ${new Date().toLocaleString()}</small></div>
          <img src="/logo.png" alt="Company" style="height:40px"/>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px">
          <div>
            <div><strong>Requested By:</strong> ${requisition.createdBy || '-'}</div>
            <div><strong>Supplier:</strong> ${requisition.supplierName || '-'}</div>
          </div>
          <div style="text-align:right">
            <div><strong>Requisition ID:</strong> ${requisition.id}</div>
            <div><strong>Date:</strong> ${requisition.createdDate ? new Date(requisition.createdDate).toLocaleDateString() : new Date().toLocaleDateString()}</div>
            <div><strong>Status:</strong> ${requisition.approvalStatus || 'Pending Approval'}</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-top:12px;font-family:ui-sans-serif,system-ui">
          <thead>
            <tr>
              <th style="text-align:left;padding:6px;border-bottom:1px solid #eee">Item</th>
              <th style="text-align:right;padding:6px;border-bottom:1px solid #eee">Qty</th>
              <th style="text-align:right;padding:6px;border-bottom:1px solid #eee">Unit</th>
              <th style="text-align:right;padding:6px;border-bottom:1px solid #eee">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align:right;padding:6px"><strong>Total</strong></td>
              <td style="text-align:right;padding:6px"><strong>${totalAmount}</strong></td>
            </tr>
          </tfoot>
        </table>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px">
          <div><div><strong>Requested By</strong></div><div style="height:64px;border-bottom:1px solid #000"></div><small>Signature / Date</small></div>
          <div><div><strong>Approved By</strong></div><div style="height:64px;border-bottom:1px solid #000"></div><small>Signature / Date</small></div>
        </div>
      `;

      const opt = {
        margin: 0,
        filename: `${requisition.id || 'requisition'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      } as any;

      (window as any).html2pdf().set(opt).from(container).save();
    } catch {
      // Silent failure to avoid blocking the UI
    }
  };

  // Role-based logic to determine which action is available
  const canApprove = currentUser.role === 'Admin' && requisition.approvalStatus === 'Pending Approval';
  const canPay = currentUser.role === 'Disbursements' && requisition.approvalStatus === 'Approved' && requisition.paymentStatus === 'Unpaid';

  // FIX: Remove the duplicate canReceive declaration and keep only the correct one
  const canReceive = (currentUser.role === 'InventoryStaff' || currentUser.role === 'Sales') && requisition.paymentStatus === 'Paid' && requisition.receiptStatus !== 'Received';

  // Status order: Pending Approval -> Rejected/Approved -> Paid-Awaiting Receipt -> Received
  const getStatusBadge = (requisition: UIRequisition) => {
    if (requisition.approvalStatus === 'Rejected') return <StatusBadge status="Rejected" />;
    if (requisition.receiptStatus === 'Received') return <StatusBadge status="Received" />;
    if (requisition.paymentStatus === 'Paid') return <StatusBadge status="Paid-Awaiting Receipt" />;
    if (requisition.approvalStatus === 'Approved') return <StatusBadge status="Approved" />;
    return <StatusBadge status="Pending Approval" />;
  };

  // Handlers now call the onAction prop with structured data
  const handleApprove = () => onAction('approve', { requisitionId: requisition.id, approvedBy: currentUser.name });
  const handleReject = () => onAction('reject', { requisitionId: requisition.id, rejectedBy: currentUser.name });
  const handlePaySubmit = () => {
    if (!paymentDetails.recipientName || !paymentDetails.amountPaid || !paymentDetails.mpesaCode) {
      toast.error('Please fill in all required payment fields.');
      return;
    }
    if (!paymentProofFile) {
      toast.error('Payment proof image is required.');
      return;
    }

    const formData = new FormData();
    formData.append('receiptFile', paymentProofFile);
    formData.append('requisitionId', requisition.id);

    const backendUrl = `${cfg.apiBase}/upload-requisition-receipt`;

    const promise = fetch(backendUrl, { method: 'POST', body: formData })
      .then(async (res) => {
        const text = await res.text();
        if (!res.ok) {
          throw new Error(text || 'Payment proof upload failed');
        }
        let data: any;
        try { data = JSON.parse(text); } catch { throw new Error('Server did not return JSON'); }
        return data;
      })
      .then((data) => {
        return onAction('pay', {
          requisitionId: requisition.id,
          paidBy: currentUser.name,
          paymentDetails: { ...paymentDetails, proofUrl: data.url },
        });
      });

    toast.promise(promise, {
      loading: 'Uploading payment proof and logging payment...',
      success: 'Payment logged successfully!',
      error: (err) => `Error: ${err.message}`,
    });
  };
 const handleReceiveSubmit = () => {
    // Enforce required fields
    if (!receivedByName) {
      toast.error('Please enter the name of the receiver.');
      return;
    }
    if (!receiptFile) {
      toast.error('Receipt image/file is required to confirm receipt.');
      return;
    }

    // SCENARIO 2: The user DID select a file.
    // We will upload the file first, then update the sheet.
    
    // 1) Prepare form data
    const formData = new FormData();
    formData.append("receiptFile", receiptFile);
    formData.append("requisitionId", requisition.id);

    // 2) Call Node server (robust parse to avoid '<!DOCTYPE' JSON crash)
    const backendUrl = `${cfg.apiBase}/upload-requisition-receipt`;

    const promise = fetch(backendUrl, { method: "POST", body: formData })
      .then(async (res) => {
        const text = await res.text();
        if (!res.ok) {
          throw new Error(text || "Receipt upload failed");
        }
        let data;
        try { data = JSON.parse(text); } catch { throw new Error("Server did not return JSON"); }
        return data;
      })
      .then((data) => {
        return onAction('receive', {
          requisitionId: requisition.id,
          receivedBy: receivedByName,
          receivedItemsNotes: receivedItemsNotes,
          receiptUrl: data.url,
        });
      });

    toast.promise(promise, {
      loading: 'Uploading receipt and finalizing requisition...',
      success: 'Requisition completed successfully!',
      error: (err) => `Error: ${err.message}`,
    });
  };  const itemsArray = (typeof requisition.items === 'string' && requisition.items) ? JSON.parse(requisition.items) : requisition.items || [];
  const paymentDetailsObject = (typeof requisition.paymentDetails === 'string' && requisition.paymentDetails) ? JSON.parse(requisition.paymentDetails) : requisition.paymentDetails || {};
  
  // Get items with descriptions
  const itemsWithDescriptions = itemsArray.filter((item: any) => item.description && item.description.trim() !== '');
  const hasDescriptions = itemsWithDescriptions.length > 0;

  // Check if this is an outsourced items requisition
  const isOutsourcedItems = requisition.expenseCategory === "Cost of Revenue (COGS)" || 
    (requisition as any).expenseType === "Purchases - Outsourced Items";
  
  // Get supplier phone from items JSON property (first item should have it)
  const supplierPhone = itemsArray.length > 0 && itemsArray[0]?.supplierPhone 
    ? itemsArray[0].supplierPhone 
    : '';

  // Generate Purchase Order PDF - Use requisition ID as PO ID
  const handleGeneratePurchaseOrder = async () => {
    try {
      await ensureHtml2PdfLoaded();
      const items = (typeof requisition.items === 'string' && requisition.items) ? JSON.parse(requisition.items) : requisition.items || [];

      const container = document.createElement('div');
      container.style.width = '210mm';
      container.style.padding = '12mm';
      container.style.background = '#fff';
      container.style.color = '#000';

      // Extract supplier phone from items
      const supplierPhoneValue = items.length > 0 && items[0]?.supplierPhone 
        ? items[0].supplierPhone 
        : '';

      const itemsRows = items.map((it: any) => {
        const qty = Number(it.quantity || 0);
        const price = Number(it.unitPrice || 0);
        const total = (qty * price).toLocaleString();
        const name = it.productName || it.name || '-';
        const desc = it.description ? ` - ${it.description}` : '';
        return `<tr><td style="padding:6px;border-bottom:1px solid #f2f2f2">${name}${desc}</td><td style="text-align:right;padding:6px;border-bottom:1px solid #f2f2f2">${qty}</td><td style="text-align:right;padding:6px;border-bottom:1px solid #f2f2f2">${price.toLocaleString()}</td><td style="text-align:right;padding:6px;border-bottom:1px solid #f2f2f2">${total}</td></tr>`;
      }).join('');

      const totalAmount = Number(requisition.totalAmount || 0).toLocaleString();
      const poId = requisition.id; // Use requisition ID as PO ID

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ddd;padding-bottom:8px">
          <div><h2 style="margin:0;font-family:ui-sans-serif,system-ui">Purchase Order</h2><small style="color:#666">Generated ${new Date().toLocaleString()}</small></div>
          <img src="/logo.png" alt="Company" style="height:40px"/>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px">
          <div>
            <div><strong>PO No:</strong> ${poId}</div>
            <div><strong>Supplier:</strong> ${requisition.supplierName || '-'}</div>
            ${supplierPhoneValue ? `<div><strong>Supplier Phone:</strong> ${supplierPhoneValue}</div>` : ''}
            <div><strong>Requested By:</strong> ${requisition.createdBy || '-'}</div>
          </div>
          <div style="text-align:right">
            <div><strong>Requisition ID:</strong> ${requisition.id}</div>
            <div><strong>Date:</strong> ${requisition.createdDate ? new Date(requisition.createdDate).toLocaleDateString() : new Date().toLocaleDateString()}</div>
            <div><strong>Status:</strong> ${requisition.approvalStatus || 'Pending Approval'}</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-top:12px;font-family:ui-sans-serif,system-ui">
          <thead>
            <tr>
              <th style="text-align:left;padding:6px;border-bottom:1px solid #eee">Product</th>
              <th style="text-align:right;padding:6px;border-bottom:1px solid #eee">Qty</th>
              <th style="text-align:right;padding:6px;border-bottom:1px solid #eee">Unit Cost</th>
              <th style="text-align:right;padding:6px;border-bottom:1px solid #eee">Total</th>
            </tr>
          </thead>
          <tbody>${itemsRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align:right;padding:6px"><strong>Total</strong></td>
              <td style="text-align:right;padding:6px"><strong>${totalAmount}</strong></td>
            </tr>
          </tfoot>
        </table>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px">
          <div><div><strong>Authorized By</strong></div><div style="height:64px;border-bottom:1px solid #000"></div><small>Signature / Date</small></div>
          <div><div><strong>Supplier Acceptance</strong></div><div style="height:64px;border-bottom:1px solid #000"></div><small>Signature / Date</small></div>
        </div>
      `;

      const opt = {
        margin: 0,
        filename: `${poId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      } as any;

      (window as any).html2pdf().set(opt).from(container).save();
      
      toast.success("Purchase Order PDF generated", {
        description: "Purchase Order has been downloaded."
      });
    } catch (err) {
      console.error('Failed to generate Purchase Order PDF:', err);
      toast.error("Failed to generate Purchase Order PDF");
    }
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-transparent data-[status='Pending Approval']:border-yellow-400 data-[status='Approved']:border-blue-400 data-[status='Paid']:border-green-400" data-status={requisition.approvalStatus === 'Approved' ? requisition.paymentStatus : requisition.approvalStatus}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 flex-wrap">
              <FileText className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="truncate">{requisition.id}</span>
              {/* Make badge clickable and change label to "Generate PO" */}
              {isOutsourcedItems && (
                <Badge 
                  variant="outline" 
                  className="bg-blue-50 text-blue-700 border-blue-300 flex items-center gap-1 cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={handleGeneratePurchaseOrder}
                >
                  <Package className="h-3 w-3" />
                  <span>Generate PO</span>
                </Badge>
              )}
            </CardTitle>
          </div>
          {getStatusBadge(requisition)}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <InfoItem icon={Building} label="Expense Category" value={<Badge variant="secondary">{requisition.expenseCategory}</Badge>} />
          <InfoItem icon={User} label="Requested by" value={requisition.createdBy} />
          <InfoItem icon={Calendar} label="Date" value={new Date(requisition.createdDate).toLocaleDateString()} />
          <InfoItem icon={DollarSign} label="Total Amount" value={<span className="font-bold text-lg">Ksh {Number(requisition.totalAmount).toLocaleString()}</span>} />
          {requisition.supplierName && <InfoItem icon={Package} label="Supplier" value={requisition.supplierName} />}
          {/* Display Supplier Phone for Outsourced Items - extracted from items */}
          {isOutsourcedItems && supplierPhone && (
            <InfoItem icon={Phone} label="Supplier Phone" value={supplierPhone} />
          )}
        </div>

        {/* --- ITEM DESCRIPTIONS SECTION (Collapsible) --- */}
        {hasDescriptions && (
          <Collapsible defaultOpen={false} className="border rounded-lg bg-muted/30">
            <CollapsibleTrigger className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors rounded-lg">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Item Descriptions</span>
                <Badge variant="secondary" className="ml-2">{itemsWithDescriptions.length}</Badge>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3">
              <div className="space-y-3 pt-2">
                {itemsWithDescriptions.map((item: any, index: number) => (
                  <div key={index} className="border-l-2 border-primary/20 pl-3 py-2 bg-background rounded">
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-sm text-primary min-w-[100px]">{item.productName || item.name}:</span>
                      <p className="text-sm text-foreground flex-1 whitespace-pre-wrap">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* --- REORGANIZED ACTION BAR --- */}
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
          {/* Primary Actions - Always Visible */}
          <div className="flex gap-2 flex-wrap">
            {/* View Items Dialog and Button */}
            <Dialog open={showItems} onOpenChange={setShowItems}>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Requisition Items - {requisition.id}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                  {itemsArray.map((item: any, index: number) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-4 gap-4 mb-3">
                          <div><Label>Item</Label><p className="font-medium">{item.productName || item.name}</p></div>
                          <div><Label>Qty</Label><p>{item.quantity}</p></div>
                          <div><Label>Unit Price</Label><p>Ksh {Number(item.unitPrice).toLocaleString()}</p></div>
                          <div><Label>Total</Label><p className="font-semibold">Ksh {(item.quantity * item.unitPrice).toLocaleString()}</p></div>
                        </div>
                        {item.description && item.description.trim() !== '' && (
                          <div className="pt-3 border-t">
                            <Label className="text-xs text-muted-foreground">Description</Label>
                            <p className="text-sm mt-1 text-foreground">{item.description}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={() => setShowItems(true)} className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">View Items</span>
              <Badge variant="secondary" className="ml-1">{itemsArray.length}</Badge>
            </Button>

            {/* Download PDF */}
            <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
            
            {/* REMOVE the big blue Generate PO button - it's now in the header badge */}
          </div>

          {/* Role-Based Actions - Grouped by Importance */}
          <div className="flex gap-2 flex-wrap ml-auto">
            {/* Admin Actions - High Priority */}
            {canApprove && (
              <>
                <Button onClick={handleApprove} className="bg-blue-600 hover:bg-blue-700 text-white animate-pulse" size="sm">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Approve</span>
                </Button>
                <Button onClick={handleReject} variant="destructive" size="sm">
                  <XCircle className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Reject</span>
                </Button>
              </>
            )}

            {/* Disbursements Actions */}
            {canPay && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700 text-white animate-pulse" size="sm">
                    <DollarSign className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Log Payment</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Log Payment for {requisition.id}</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <InfoItem icon={User} label="Recipient Name" value={<Input value={paymentDetails.recipientName} onChange={(e) => setPaymentDetails({...paymentDetails, recipientName: e.target.value})} />} />
                    <InfoItem icon={DollarSign} label="Amount Paid" value={<Input type="number" value={paymentDetails.amountPaid} onChange={(e) => setPaymentDetails({...paymentDetails, amountPaid: Number(e.target.value) || 0})} />} />
                    <InfoItem icon={FileText} label="Mpesa Code" value={<Input value={paymentDetails.mpesaCode} onChange={(e) => setPaymentDetails({...paymentDetails, mpesaCode: e.target.value})} />} />
                    <InfoItem icon={DollarSign} label="Transaction Cost" value={<Input type="number" value={paymentDetails.transactionCost} onChange={(e) => setPaymentDetails({...paymentDetails, transactionCost: Number(e.target.value) || 0})} />} />
                    <div className="space-y-2">
                      <Label>Upload Payment Proof (Image) *</Label>
                      <Input type="file" accept=".png,.jpg,.jpeg" onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handlePaySubmit}>Submit Payment</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Inventory Staff Actions */}
            {canReceive && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white animate-pulse" size="sm">
                    <Package className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Confirm Receipt</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Confirm Receipt for {requisition.id}</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="receivedBy">Received By *</Label>
                      <Input 
                        id="receivedBy" 
                        value={receivedByName} 
                        onChange={(e) => setReceivedByName(e.target.value)}
                        placeholder="Enter name of person who received the items"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="receivedDate">Received Date</Label>
                      <Input id="receivedDate" value={new Date().toLocaleDateString()} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm Items Received</Label>
                      <Textarea value={receivedItemsNotes} onChange={(e) => setReceivedItemsNotes(e.target.value)} placeholder="Were all items received as requested? Add any notes here..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Upload Receipt *</Label>
                      <Input type="file" accept=".png,.jpg,.jpeg,.pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleReceiveSubmit}>Confirm & Submit</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Show Received status if already received */}
            {requisition.receiptStatus === 'Received' && (
              <Button disabled className="bg-green-600 text-white" size="sm">
                <CheckCircle className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Received</span>
              </Button>
            )}
          </div>
        </div>
        
        {/* --- DETAILS SECTION - More Compact --- */}
        {(requisition.approvedBy || requisition.paidBy || requisition.receivedBy || requisition.receiptUrl) && (
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            {requisition.approvedBy && <div>✓ Approved by <strong>{requisition.approvedBy}</strong> on {new Date(requisition.approvalDate!).toLocaleDateString()}</div>}
            {requisition.paidBy && <div>✓ Paid by <strong>{requisition.paidBy}</strong> on {new Date(requisition.paymentDate!).toLocaleDateString()}</div>}
            {paymentDetailsObject.mpesaCode && <div>(Mpesa Code: {paymentDetailsObject.mpesaCode})</div>}
            {requisition.receivedBy && <div>✓ Received by <strong>{requisition.receivedBy}</strong> on {new Date(requisition.receivedDate!).toLocaleDateString()}</div>}
            {requisition.receiptUrl && (
              <div className="pt-2">
                <Button asChild variant="outline" size="sm">
                  <a href={requisition.receiptUrl} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Receipt
                  </a>
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// A helper component to keep the info display consistent
const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => (
  <div className="flex items-center gap-2">
    <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    <span className="font-medium">{label}:</span>
    <div className="text-foreground">{value}</div>
  </div>
);