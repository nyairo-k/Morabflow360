import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/Inventory/components/ui/dialog";
import { Button } from "@/components/Inventory/components/ui/button";
import { Input } from "@/components/Inventory/components/ui/input";
import { Label } from "@/components/Inventory/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Inventory/components/ui/card";
import { Separator } from "@/components/Inventory/components/ui/separator";
import { Badge } from "@/components/Inventory/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/Inventory/components/ui/table";
import { Upload, DollarSign, CreditCard, Receipt, Building, Phone } from "lucide-react";
import { toast } from "sonner";
import type { PurchaseOrder, PaymentDetails } from "@/components/Inventory/types";

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder;
  // It now receives a handler that accepts the data and the file
  onPaymentLogged: (paymentData: any, receiptFile: File | null) => void;
  currentUser: { name: string }; // Added currentUser prop
}

export function PaymentDialog({ 
  open, 
  onClose, 
  purchaseOrder, 
  onPaymentLogged, 
  currentUser 
}: PaymentDialogProps) {

  const [amountPaid, setAmountPaid] = useState("");
  const [mpesaCode, setMpesaCode] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // FIX: Define amount at component level so it can be used in JSX
  const amount = parseFloat(amountPaid) || 0;

  // FIX: Replace the old .reduce calls with your new functions
  const getTotalPaid = () => {
    try {
      // Handle different data types that might come from Google Sheets
      let paymentDetails = [];
      
      if (purchaseOrder.paymentDetailsToSupplier) {
        if (typeof purchaseOrder.paymentDetailsToSupplier === 'string') {
          // If it's a JSON string, parse it
          paymentDetails = JSON.parse(purchaseOrder.paymentDetailsToSupplier);
        } else if (Array.isArray(purchaseOrder.paymentDetailsToSupplier)) {
          // If it's already an array, use it directly
          paymentDetails = purchaseOrder.paymentDetailsToSupplier;
        }
      }
      
      // Ensure paymentDetails is an array and has the right structure
      if (!Array.isArray(paymentDetails)) {
        paymentDetails = [];
      }
      
      return paymentDetails.reduce((sum, payment) => {
        const amount = typeof payment === 'object' ? payment.amount || payment.amountPaid : Number(payment) || 0;
        return sum + Number(amount);
      }, 0);
    } catch (error) {
      console.error('Error calculating total paid:', error);
      return 0;
    }
  };

  const getOutstandingAmount = () => {
    const totalPaid = getTotalPaid();
    const purchasePrice = Number(purchaseOrder.purchasePrice) || 0;
    return Math.max(0, purchasePrice - totalPaid);
  };

  // FIX: Use the new functions instead of direct .reduce calls
  const totalPaid = getTotalPaid();
  const outstandingAmount = getOutstandingAmount();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (images only)
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file for proof of payment.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      setReceiptFile(file);
    }
  };

  // ADD THIS NEW FUNCTION: Handle file upload to server
  const handleFileUpload = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append("receiptFile", file);
      formData.append("poId", purchaseOrder.poId);
      formData.append("invoiceId", purchaseOrder.relatedInvoiceId);

      const response = await fetch("http://localhost:4000/upload-purchase-order-receipt", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("File upload failed");
      }

      const result = await response.json();
      return result.url; // Return the public URL
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to upload receipt file');
      throw error;
    }
  };

  // UPDATE YOUR EXISTING handleSubmit FUNCTION:
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amountPaid || !mpesaCode) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    const outstanding = outstandingAmount;
    if (amount > outstanding) {
      toast.error(`Amount exceeds outstanding balance of KSh ${outstanding.toLocaleString()}`);
      return;
    }

    setIsSubmitting(true);

    try {
      let receiptUrl = '';
      
      // UPLOAD FILE FIRST if a receipt was selected
      if (receiptFile) {
        receiptUrl = await handleFileUpload(receiptFile);
        console.log('Receipt uploaded successfully:', receiptUrl);
      }

      const paymentData = {
        amountPaid: amount,
        mpesaCode: mpesaCode,
        paymentDate: new Date().toISOString(),
        loggedBy: currentUser.name,
        receiptUrl: receiptUrl // Include the receipt URL in payment data
      };

      // ADD THIS LOGGING:
      console.log('Payment data being sent to onPaymentLogged:', paymentData);
      console.log('Receipt file being sent:', receiptFile);

      await onPaymentLogged(paymentData, receiptFile);
      onClose();
    } catch (error) {
      console.error('Payment submission error:', error);
      toast.error('Failed to log payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmountPaid("");
    setMpesaCode("");
    setReceiptFile(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Supplier Payment - {purchaseOrder.poId}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Supplier & PO Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purchase Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span className="font-medium">{purchaseOrder.supplierName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Phone className="h-3 w-3" />
                    {purchaseOrder.supplierPhone}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Related Invoice</p>
                  <p className="font-medium">{purchaseOrder.relatedInvoiceId}</p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Purchase Price</p>
                  <p className="text-lg font-bold">KSh {purchaseOrder.purchasePrice.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paid So Far</p>
                  <p className="text-lg font-bold text-status-completed">KSh {totalPaid.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                  <p className="text-lg font-bold text-status-unpaid">KSh {outstandingAmount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          {purchaseOrder.paymentDetailsToSupplier && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>M-PESA Code</TableHead>
                      <TableHead>Proof</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* FIX: Use the same safe parsing function */}
                    {(() => {
                      try {
                        let paymentDetails = [];
                        if (purchaseOrder.paymentDetailsToSupplier) {
                          if (typeof purchaseOrder.paymentDetailsToSupplier === 'string') {
                            paymentDetails = JSON.parse(purchaseOrder.paymentDetailsToSupplier);
                          } else if (Array.isArray(purchaseOrder.paymentDetailsToSupplier)) {
                            paymentDetails = purchaseOrder.paymentDetailsToSupplier;
                          }
                        }
                        return Array.isArray(paymentDetails) ? paymentDetails : [];
                      } catch (error) {
                        console.error('Error parsing payment details:', error);
                        return [];
                      }
                    })().map((payment, index) => (
                      <TableRow key={index}>
                        <TableCell>{payment.paymentDate || payment.date}</TableCell>
                        <TableCell>KSh {Number(payment.amountPaid || payment.amount).toLocaleString()}</TableCell>
                        <TableCell className="font-mono">{payment.mpesaCode}</TableCell>
                        <TableCell>
                          {payment.proofOfPayment || payment.receiptUrl ? (
                            <Badge variant="secondary">
                              <Receipt className="h-3 w-3 mr-1" />
                              Uploaded
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">No proof</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Log New Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amountPaid">
                      <DollarSign className="inline h-4 w-4 mr-1" />
                      Amount Paid *
                    </Label>
                    <Input
                      id="amountPaid"
                      type="number"
                      min="0"
                      max={outstandingAmount}
                      step="0.01"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum: KSh {outstandingAmount.toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="mpesaCode">
                      <CreditCard className="inline h-4 w-4 mr-1" />
                      M-PESA Code *
                    </Label>
                    <Input
                      id="mpesaCode"
                      value={mpesaCode}
                      onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                      placeholder="RBK1234567"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proofFile">
                    <Upload className="inline h-4 w-4 mr-1" />
                    Proof of Payment (Optional)
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="proofFile"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                    {receiptFile && (
                      <Badge variant="secondary">
                        {receiptFile.name}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload an image file (max 5MB)
                  </p>
                </div>

                {amount > 0 && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <p className="font-medium">Payment Summary</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">New Payment</p>
                            <p className="font-semibold">KSh {amount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Remaining Balance</p>
                            <p className="font-semibold">KSh {(outstandingAmount - amount).toLocaleString()}</p>
                          </div>
                        </div>
                        {(outstandingAmount - amount) <= 0 && (
                          <Badge className="bg-status-completed text-status-completed-foreground">
                            This payment will mark the PO as PAID
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Separator />

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || outstandingAmount <= 0}>
                    {isSubmitting ? "Logging Payment..." : "Log Payment"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}