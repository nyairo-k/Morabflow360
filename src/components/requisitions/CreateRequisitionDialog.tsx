import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { User } from "@/types/requisition";
import { toast } from "sonner";

// Props interface is correct
interface CreateRequisitionDialogProps {
  currentUser: User;
  onAction: (action: string, data: any) => void;
}

export function CreateRequisitionDialog({ currentUser, onAction }: CreateRequisitionDialogProps) {
  const [open, setOpen] = useState(false);
  // State for form data is correct, ensuring supplierName is present
  const [formData, setFormData] = useState({
    department: '',
    supplierName: '',
    notes: ''
  });
  const [items, setItems] = useState([
    { name: '', quantity: 1, unitPrice: 0, description: '' }
  ]);

  const departments = ['HR', 'Finance', 'IT', 'Operations', 'Marketing', 'Legal'];

  // All form helper functions are correct and require no changes
  const addItem = () => setItems([...items, { name: '', quantity: 1, unitPrice: 0, description: '' }]);
  const removeItem = (index: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };
  const updateItem = (index: number, field: string, value: any) => {
    const updated = items.map((item, i) => i === index ? { ...item, [field]: value } : item);
    setItems(updated);
  };
  const calculateTotal = () => items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation is correct
    if (!formData.department || !formData.supplierName) {
      toast.error("Please fill in department and supplier name.");
      return;
    }
    if (items.some(item => !item.name || item.quantity <= 0)) {
      toast.error("Please fill in all item names and quantities correctly.");
      return;
    }

    const requisitionData = {
      department: formData.department,
      supplierName: formData.supplierName,
      createdBy: currentUser.name,
      totalAmount: calculateTotal(),
      items: items.map(item => ({
          productName: item.name,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice
      })),
      notes: formData.notes
    };

    onAction('create', requisitionData);
    
    // Reset form is correct
    setFormData({ department: '', supplierName: '', notes: '' });
    setItems([{ name: '', quantity: 1, unitPrice: 0, description: '' }]);
    setOpen(false);
  };

  // ====== THIS SECTION RESTORES THE FULL, CORRECT UI FROM YOUR ORIGINAL FILE ======
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create New Requisition
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Create New Requisition
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


             <div className="space-y-2">
              <Label htmlFor="requestedBy">Requested By *</Label>
              <Input
                id="requestedBy"
                value={formData.requestedBy}
                onChange={(e) => setFormData({...formData, requestedBy: e.target.value})}
                placeholder="Enter requester's name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier Name *</Label>
              <Input
                id="supplier"
                value={formData.supplierName}
                onChange={(e) => setFormData({...formData, supplierName: e.target.value})}
                placeholder="Enter supplier name"
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Items</Label>
              <Button type="button" onClick={addItem} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
            
            {items.map((item, index) => (
              <Card key={index} className="border-border">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-4 space-y-2">
                      <Label htmlFor={`item-name-${index}`}>Item Name *</Label>
                      <Input id={`item-name-${index}`} value={item.name} onChange={(e) => updateItem(index, 'name', e.target.value)} required />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor={`item-qty-${index}`}>Quantity *</Label>
                      <Input id={`item-qty-${index}`} type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} required />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor={`item-price-${index}`}>Unit Price (Ksh) *</Label>
                      <Input id={`item-price-${index}`} type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)} required />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label>Total</Label>
                      <Input value={`Ksh ${(item.quantity * item.unitPrice).toLocaleString()}`} disabled className="bg-muted" />
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      {items.length > 1 && (
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeItem(index)}><Trash2 className="h-4 w-4" /></Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Label htmlFor={`item-desc-${index}`}>Description</Label>
                    <Textarea id={`item-desc-${index}`} value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} placeholder="Optional item description" rows={2} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Optional notes or special instructions" rows={3} />
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-lg font-semibold">
              Total Amount: Ksh {calculateTotal().toLocaleString()}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Create Requisition</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}