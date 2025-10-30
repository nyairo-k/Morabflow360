import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/Inventory/components/ui/dialog";
import { Button } from "@/components/Inventory/components/ui/button";
import { Input } from "@/components/Inventory/components/ui/input";
import { Label } from "@/components/Inventory/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Inventory/components/ui/card";
import { Separator } from "@/components/Inventory/components/ui/separator";
import { Badge } from "@/components/Inventory/components/ui/badge";
import { Building, Phone, DollarSign, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { isTenDigitPhone, normalizeTenDigitPhone } from "@/lib/utils";
import type { InvoiceLineItem, PurchaseOrder, Supplier } from "@/components/Inventory/types/inventory";

interface PurchaseOrderDialogProps {
  open: boolean;
  onClose: () => void;
  lineItem: InvoiceLineItem;
  invoiceId: string;
  onAction: (action: string, data: any) => void;
  onPOCreated: (poData: PurchaseOrder | any) => void;
  suppliers: Supplier[]; 
}

export function PurchaseOrderDialog({ 
  open, 
  onClose, 
  lineItem, 
  invoiceId, 
  onAction,
  onPOCreated,
  suppliers
}: PurchaseOrderDialogProps) {
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);


  const sellingPrice = lineItem.unitPrice;
  const purchasePriceNum = parseFloat(purchasePrice) || 0;
  const profitMargin = sellingPrice - purchasePriceNum;
  const profitPercentage = sellingPrice > 0 ? (profitMargin / sellingPrice) * 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supplierName || !supplierPhone || !purchasePrice) {
      toast.error("Missing Information", {
        description: "Please fill in all required fields.",
      });
      return;
    }

    // Validate supplier phone: exactly 10 digits
    if (!isTenDigitPhone(supplierPhone)) {
      toast.error("Invalid supplier phone", { description: "Phone number must have exactly 10 digits." });
      return;
    }

    const currentUserName = (typeof window !== 'undefined' && sessionStorage.getItem('currentUserName')) || 'Current User';

    const poData: any = {
      poId: `PO-${Date.now()}`,
      supplierName: supplierName,
      supplierPhone: normalizeTenDigitPhone(supplierPhone),
      purchasePrice: parseFloat(purchasePrice) || 0,
      relatedInvoiceId: invoiceId,
      productName: lineItem.productName,
      quantity: lineItem.quantity,
      sellingPrice: lineItem.unitPrice,
      profit: profitMargin,
      createdDate: new Date().toISOString(),
      createdBy: currentUserName,
      paymentStatusToSupplier: 'UNPAID'
    };
    
    // Notify parent immediately so the UI updates (poId set, status becomes ready)
    onPOCreated(poData);

    // Build a standalone printable HTML and offer it via toast link (no navigation)
    try {
      const qty = Number(poData.quantity || 0);
      const price = Number(poData.purchasePrice || 0);
      const total = (qty * price).toLocaleString();

      const html = `<!doctype html><html><head><meta charset=\"utf-8\"/><title>Purchase Order</title>
<style>body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto;}
@page{size:A4;margin:12mm;} .wrap{width:210mm;min-height:297mm;padding:12mm;margin:0 auto;background:#fff;color:#000}
.hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ddd;padding-bottom:8px}
small{color:#666} table{width:100%;border-collapse:collapse;margin-top:12px} th,td{padding:6px;border-bottom:1px solid #eee}
th{text-align:left} td.num{text-align:right}
.section{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px}
.sign{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:28px}
.box{height:64px;border-bottom:1px solid #000}
</style></head><body>
<div class=\"wrap\">
  <div class=\"hdr\"><div><h2>Purchase Order</h2><small>Generated ${new Date().toLocaleString()}</small></div><img src=\"/logo.png\" alt=\"Company\" style=\"height:40px\"/></div>
  <div class=\"section\">
    <div>
      <div><strong>PO No:</strong> ${poData.poId}</div>
      <div><strong>Supplier:</strong> ${poData.supplierName}</div>
      <div><strong>Phone:</strong> ${poData.supplierPhone}</div>
    </div>
    <div style=\"text-align:right\">
      <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
      <div><strong>Invoice Ref:</strong> ${poData.relatedInvoiceId || '-'}</div>
      <div><strong>Created By:</strong> ${poData.createdBy || '-'}</div>
    </div>
  </div>
  <table><thead><tr><th>Product</th><th class=\"num\">Qty</th><th class=\"num\">Unit Cost</th><th class=\"num\">Total</th></tr></thead>
    <tbody><tr><td>${poData.productName}</td><td class=\"num\">${qty}</td><td class=\"num\">${price.toLocaleString()}</td><td class=\"num\">${total}</td></tr></tbody>
    <tfoot><tr><td colspan=\"3\" style=\"text-align:right\"><strong>Total</strong></td><td class=\"num\"><strong>${total}</strong></td></tr></tfoot>
  </table>
  <div class=\"sign\"><div><div><strong>Authorized By</strong></div><div class=\"box\"></div><small>Signature / Date</small></div>
       <div><div><strong>Supplier Acceptance</strong></div><div class=\"box\"></div><small>Signature / Date</small></div></div>
</div>
<script>window.addEventListener('load',()=>{document.title='Purchase Order';});</script>
</body></html>`;

      const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      toast.success("Purchase Order created", {
        description: (
          <a href={blobUrl} target="_blank" rel="noopener" className="underline">
            Open print view in new tab
          </a>
        )
      });
      setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
    } catch (err) {
      console.error('Failed to prepare PO print view:', err);
    }
    
    // Close the dialog
    handleClose();
  };


  const resetForm = () => {
    setSupplierName("");
    setSupplierPhone("");
    setPurchasePrice("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Product Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{lineItem.productName}</p>
                    <p className="text-sm text-muted-foreground">Product ID: {lineItem.productId}</p>
                  </div>
                  <Badge variant="outline">Qty: {lineItem.quantity}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Selling Price (per unit):</span>
                  <span className="font-semibold">KSh {sellingPrice.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplierName">
                  <Building className="inline h-4 w-4 mr-1" />
                  Supplier Name *
                </Label>
                <Input
                  id="supplierName"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Enter supplier name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="supplierPhone">
                  <Phone className="inline h-4 w-4 mr-1" />
                  Supplier Phone *
                </Label>
                <Input
                  id="supplierPhone"
                  type="tel"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="07XXXXXXXX"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchasePrice">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Purchase Price (per unit) *
              </Label>
              <Input
                id="purchasePrice"
                type="number"
                min="0"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            {purchasePriceNum > 0 && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="font-medium">Profit Analysis</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Purchase Cost</p>
                        <p className="font-semibold">KSh {(purchasePriceNum * lineItem.quantity).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Selling Revenue</p>
                        <p className="font-semibold">KSh {(sellingPrice * lineItem.quantity).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Profit</p>
                        <p className={`font-semibold ${profitMargin >= 0 ? 'text-status-completed' : 'text-status-unpaid'}`}>
                          KSh {(profitMargin * lineItem.quantity).toLocaleString()} ({profitPercentage.toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Purchase Order"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}