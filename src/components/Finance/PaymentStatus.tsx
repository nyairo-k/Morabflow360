import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Edit, Save } from "lucide-react";
import { toast } from "sonner";

interface PaymentStatusProps {
  invoices: any[];
  onUpdatePaymentStatus: (id: string, status: string) => void;
}

export function PaymentStatus({ invoices, onUpdatePaymentStatus }: PaymentStatusProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");

  const handleEditPayment = (invoiceId: string, currentStatus: string) => {
    setEditingId(invoiceId);
    setNewStatus(currentStatus);
  };

  const handleSavePayment = (invoiceId: string) => {
    onUpdatePaymentStatus(invoiceId, newStatus);
    setEditingId(null);
    toast.success("Payment status updated successfully");
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return <Badge variant="secondary" className="bg-status-paid text-white"><DollarSign className="w-3 h-3 mr-1" />Paid</Badge>;
      case "Partially Paid":
        return <Badge variant="secondary" className="bg-status-partial text-white"><DollarSign className="w-3 h-3 mr-1" />Partial</Badge>;
      case "Unpaid":
        return <Badge variant="secondary" className="bg-status-unpaid text-white"><DollarSign className="w-3 h-3 mr-1" />Unpaid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const uploadedInvoices = invoices.filter(inv => inv.status === "Uploaded");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5" />
          <span>Payment Status Management</span>
          <Badge variant="secondary" className="ml-2">{uploadedInvoices.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {uploadedInvoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No uploaded invoices to manage</p>
            <p className="text-sm">Upload invoice PDFs to manage payment status</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Product/Service</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploadedInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.id}</TableCell>
                  <TableCell>{invoice.clientName}</TableCell>
                  <TableCell>{invoice.productService}</TableCell>
                  <TableCell>${parseFloat(invoice.totalAmount).toLocaleString()}</TableCell>
                  <TableCell>
                    {invoice.uploadedDate ? new Date(invoice.uploadedDate).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    {editingId === invoice.id ? (
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Unpaid">Unpaid</SelectItem>
                          <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                          <SelectItem value="Paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      getPaymentBadge(invoice.paymentStatus)
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === invoice.id ? (
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleSavePayment(invoice.id)}
                          className="bg-status-approved hover:bg-status-approved/90"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditPayment(invoice.id, invoice.paymentStatus)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}