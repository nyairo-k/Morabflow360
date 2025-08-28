import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, PlusCircle, Send, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

// This defines what data the form needs to send up to the main Index.tsx page
interface QuotationFormProps {
  onSubmit: (quotation: any) => Promise<void>;
}

// This defines the structure for a single line item in our list
interface LineItem {
  productName: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

export function QuotationForm({ onSubmit }: QuotationFormProps) {
  const [clientName, setClientName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { productName: "", description: "", quantity: "1", unitPrice: "0.00" }
  ]);
  // State to hold the calculated total amount
  const [totalAmount, setTotalAmount] = useState("0.00");
  // State to manage the loading status of the button
  const [isSaving, setIsSaving] = useState(false);

  // --- HELPER FUNCTIONS ---

  // This function runs whenever a user types into one of the item fields
  const handleItemChange = (index: number, field: keyof LineItem, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
    calculateTotal(newItems);
  };

  // This adds a new, blank item row to the list
  const addItem = () => {
    setItems([...items, { productName: "", description: "", quantity: "1", unitPrice: "0.00" }]);
  };

  // This removes an item row from the list
  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    calculateTotal(newItems);
  };

  // This calculates the grand total from all item rows
  const calculateTotal = (currentItems: LineItem[]) => {
    const total = currentItems.reduce((acc, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      return acc + (quantity * unitPrice);
    }, 0);
    setTotalAmount(total.toFixed(2));
  };
  
  // This runs when the user clicks the final "Generate Quotation" button
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true); // Start loading

    const quotation = {
        id: `QT-${Date.now()}`,
        clientName: clientName,
        customerPhone: customerPhone,
        items: items,
        totalAmount: totalAmount,
        status: "Pending",
        submittedBy: "Current User",
        submittedDate: new Date().toISOString()
    };

    try {
        await onSubmit(quotation); // Wait for the submission to finish
        toast.success("Quotation and PDF created successfully!");
        
        // Reset form only on success
        setClientName("");
        setCustomerPhone(""); 
        setItems([{ productName: "", description: "", quantity: "1", unitPrice: "0.00" }]);
        setTotalAmount("0.00");
    } catch (error) {
        console.error("Submission failed:", error);
        // The alert is handled in the parent component (Index.tsx)
    } finally {
        setIsSaving(false); // Stop loading, regardless of success or failure
    }
  };

  // --- JSX (The visual part of the component) ---
 return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2"><FileText className="h-5 w-5" /><span>Create New Quotation</span></CardTitle>
        <CardDescription>Generate a professional quotation for your client</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* ====== MODIFIED SECTION ====== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name *</Label>
              <Input id="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Enter client company name" required />
            </div>

            {/* This is the new field, added for consistency */}
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Customer Phone</Label>
              <Input id="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+2547..." />
            </div>
          </div>
          {/* ============================= */}


          {/* Items Section Header */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium">Items</h3>
          </div>
          
          {/* This is where we loop through and display each item row */}
          {items.map((item, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4 relative">
              {items.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => removeItem(index)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`productName-${index}`}>Product/Service *</Label>
                  <Input id={`productName-${index}`} value={item.productName} onChange={(e) => handleItemChange(index, "productName", e.target.value)} placeholder="Medical equipment or service" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`description-${index}`}>Description</Label>
                  <Input id={`description-${index}`} value={item.description} onChange={(e) => handleItemChange(index, "description", e.target.value)} placeholder="Detailed description" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                  <Label htmlFor={`quantity-${index}`}>Quantity *</Label>
                  <Input id={`quantity-${index}`} type="number" value={item.quantity} onChange={(e) => handleItemChange(index, "quantity", e.target.value)} placeholder="0" min="1" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`unitPrice-${index}`}>Unit Price (Ksh) *</Label>
                  <Input id={`unitPrice-${index}`} type="number" step="0.01" value={item.unitPrice} onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)} placeholder="0.00" min="0" required />
                </div>
              </div>
            </div>
          ))}

          {/* "Add Item" Button */}
          <div className="flex justify-start">
            <Button type="button" variant="outline" onClick={addItem} className="flex items-center space-x-2">
              <PlusCircle className="h-4 w-4" />
              <span>Add Another Item</span>
            </Button>
          </div>

          {/* Total Amount Display */}
          <div className="flex justify-end items-center space-x-4 border-t pt-4">
            <span className="text-lg font-semibold">Grand Total:</span>
            <span className="text-xl font-bold">Ksh {totalAmount}</span>
          </div>

          {/* Form Submission Buttons */}
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline">Save as Draft</Button>
            <Button type="submit" disabled={isSaving} className="flex items-center space-x-2">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>{isSaving ? "Generating..." : "Generate Quotation"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}