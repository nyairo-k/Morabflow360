import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSignature, PlusCircle, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { isTenDigitPhone, normalizeTenDigitPhone } from "@/lib/utils";

interface InvoiceRequestFormProps {
  onSubmit: (invoice: any) => void;
}

interface LineItem {
  productName: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

export function InvoiceRequestForm({ onSubmit }: InvoiceRequestFormProps) {
  const [clientName, setClientName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { productName: "", description: "", quantity: "1", unitPrice: "0.00" }
  ]);
  const [totalAmount, setTotalAmount] = useState("0.00");

  const handleItemChange = (index: number, field: keyof LineItem, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
    calculateTotal(newItems);
  };

  const addItem = () => {
    setItems([...items, { productName: "", description: "", quantity: "1", unitPrice: "0.00" }]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    calculateTotal(newItems);
  };

  const calculateTotal = (currentItems: LineItem[]) => {
    const total = currentItems.reduce((acc, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      return acc + (quantity * unitPrice);
    }, 0);
    setTotalAmount(total.toFixed(2));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPhone = normalizeTenDigitPhone(customerPhone);
    if (!isTenDigitPhone(customerPhone)) {
      toast.error("Invalid phone number", { description: "Phone number must have exactly 10 digits." });
      return;
    }
    
    const invoiceRequest = {
      id: `INV-REQ-${Date.now()}`,
      clientName: clientName,
      customerPhone: normalizedPhone,
      items: items,
      totalAmount: totalAmount,
      status: "Waiting",
    };
    
    onSubmit(invoiceRequest);
    toast.success("Invoice requested successfully!");
    
    setClientName("");
    setCustomerPhone(""); 
    setItems([{ productName: "", description: "", quantity: "1", unitPrice: "0.00" }]);
    setTotalAmount("0.00");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileSignature className="h-5 w-5" />
          <span>Request New Invoice</span>
        </CardTitle>
        <CardDescription>Directly request an invoice for a client.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inv-clientName">Client Name *</Label>
              <Input id="inv-clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Enter client name" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv-customerPhone">Customer Phone *</Label>
              <Input
                id="inv-customerPhone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="07XXXXXXXX"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                required
              />
            </div>
          </div>

          <div className="border-t pt-4"><h3 className="text-lg font-medium">Items</h3></div>
          
          {items.map((item, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4 relative">
              {items.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => removeItem(index)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`inv-productName-${index}`}>Product/Service *</Label>
                  <Input id={`inv-productName-${index}`} value={item.productName} onChange={(e) => handleItemChange(index, "productName", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`inv-description-${index}`}>Description</Label>
                  <Input id={`inv-description-${index}`} value={item.description} onChange={(e) => handleItemChange(index, "description", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                  <Label htmlFor={`inv-quantity-${index}`}>Quantity *</Label>
                  <Input id={`inv-quantity-${index}`} type="number" value={item.quantity} onChange={(e) => handleItemChange(index, "quantity", e.target.value)} min="1" required />
                </div>
                <div className="space-y-2">
                <Label htmlFor={`inv-unitPrice-${index}`}>Unit Price (Ksh) *</Label>
                  <Input id={`inv-unitPrice-${index}`} type="number" step="0.01" value={item.unitPrice} onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)} min="0" required />
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-start">
            <Button type="button" variant="outline" onClick={addItem} className="flex items-center space-x-2"><PlusCircle className="h-4 w-4" /><span>Add Another Item</span></Button>
          </div>

          <div className="flex justify-end items-center space-x-4 border-t pt-4">
            <span className="text-lg font-semibold">Grand Total:</span>
            <span className="text-xl font-bold">Ksh {totalAmount}</span>
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="flex items-center space-x-2"><Send className="h-4 w-4" /><span>Submit Invoice Request</span></Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}