import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, ShoppingCart, Package, Phone } from "lucide-react";
import { User } from "@/types/requisition";
import { toast } from "sonner";

// Props interface
interface CreateRequisitionDialogProps {
  currentUser: User;
  onAction: (action: string, data: any) => void;
}

// Expense classification data structure
const expenseData = {
  "Cost of Revenue (COGS)": {
    "Product & Material Acquisition": ["Purchases - Outsourced Items", "Purchases - Raw Materials", "Inbound Shipping & Freight", "Direct Labor", "Other"]
  },
  "Overhead Costs": {
    "Facilities & Office": ["Rent & Leases", "Utilities", "Office Supplies & Consumables", "Repairs & Maintenance - Office", "Other"],
    "Core Administration": ["Salaries - Admin & Management", "Software & Subscriptions", "Professional Fees", "Bank Charges & Fees", "Insurance", "Other"]
  },
  "Operating Expenses (OpEx)": {
    "Sales & Marketing": ["Advertising & Promotion", "Sales Commissions", "Salaries - Sales & Marketing Team", "Marketing Materials & Printing", "Other"],
    "Transportation & Logistics": ["Vehicle Fuel", "Vehicle Repair & Maintenance", "Tolls, Parking & Transport Fees", "Outbound Shipping & Delivery", "Other"],
    "Field & Project Operations": ["Field Facilitation", "Travel & Accommodation", "Project-Specific Materials", "Other"],
    "Personnel & Employee Welfare": ["Employee Meals & Sustenance", "Staff Training & Development", "Recruitment Costs", "Medical & Health", "Other"]
  },
  "Other": {
     "Miscellaneous": ["Please specify in description"]
  }
};

export function CreateRequisitionDialog({ currentUser, onAction }: CreateRequisitionDialogProps) {
  const [open, setOpen] = useState(false);
  
  // New expense classification states
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseClass, setExpenseClass] = useState('');
  const [expenseType, setExpenseType] = useState('');
  const [otherType, setOtherType] = useState('');
  
  // Form data state - remove invoiceId completely
  const [formData, setFormData] = useState({
    supplierName: '',
    supplierPhone: '',
    notes: '',
  });
  
  const [items, setItems] = useState([
    { name: '', quantity: 1, unitPrice: 0, description: '' }
  ]);

  // Helper functions
  const addItem = () => setItems([...items, { name: '', quantity: 1, unitPrice: 0, description: '' }]);
  const removeItem = (index: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };
  const updateItem = (index: number, field: string, value: any) => {
    const updated = items.map((item, i) => i === index ? { ...item, [field]: value } : item);
    setItems(updated);
  };
  const calculateTotal = () => items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  // Cascading logic handlers
  const handleCategoryChange = (value: string) => {
    setExpenseCategory(value);
    setExpenseClass('');
    setExpenseType('');
    setOtherType('');
    
    // Auto-set for "Other" category
    if (value === "Other") {
      setExpenseClass("Miscellaneous");
    }
  };

  const handleClassChange = (value: string) => {
    setExpenseClass(value);
    setExpenseType('');
    setOtherType('');
  };

  const handleTypeChange = (value: string) => {
    setExpenseType(value);
    setOtherType('');
  };

  // Get available classes for selected category
  const getAvailableClasses = () => {
    if (!expenseCategory) return [];
    return Object.keys(expenseData[expenseCategory as keyof typeof expenseData] || {});
  };

  // Get available types for selected class
  const getAvailableTypes = () => {
    if (!expenseCategory || !expenseClass) return [];
    return expenseData[expenseCategory as keyof typeof expenseData]?.[expenseClass as keyof typeof expenseData[keyof typeof expenseData]] || [];
  };

  // Check if current type is "Other"
  const isOtherType = expenseType === "Other";
  const isOtherCategory = expenseCategory === "Other";
  
  // Check if current type is "Purchases - Outsourced Items"
  const isOutsourcedItems = expenseType === "Purchases - Outsourced Items";

  // Determine what to show for supplier/field rep name
  const isFieldFacilitation = expenseType === "Field Facilitation";
  const supplierLabel = isFieldFacilitation ? "Field Rep Name" : "Supplier Name";
  const supplierPlaceholder = isFieldFacilitation ? "Enter field rep name" : "Enter supplier name";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation - handle "Other" category specially
    if (!expenseCategory) {
      toast.error("Please select expense category.");
      return;
    }
    
    // For "Other" category, we only need the category (class and type are auto-set)
    if (expenseCategory === "Other") {
      if (!formData.supplierName) {
        toast.error("Please fill in supplier/field rep name.");
        return;
      }
      
      if (items.some(item => !item.name || item.quantity <= 0)) {
        toast.error("Please fill in all item names and quantities correctly.");
        return;
      }
    } else {
      // For all other categories, require class and type
      if (!expenseClass || !expenseType) {
        toast.error("Please select expense class and type.");
        return;
      }
      
      if (isOtherType && !otherType.trim()) {
        toast.error("Please specify the expense type.");
        return;
      }
      
      // REMOVE invoiceId validation for outsourced items
      // if (isOutsourcedItems && !formData.invoiceId.trim()) {
      //   toast.error("Please enter the Invoice ID for outsourced items.");
      //   return;
      // }
      
      if (!formData.supplierName) {
        toast.error("Please fill in supplier/field rep name.");
        return;
      }
      
      if (items.some(item => !item.name || item.quantity <= 0)) {
        toast.error("Please fill in all item names and quantities correctly.");
        return;
      }
    }

    // Determine final expense type value
    const finalExpenseType = isOtherType ? otherType : expenseType;

    // Get supplier phone for outsourced items
    const supplierPhoneValue = isOutsourcedItems ? formData.supplierPhone : undefined;

    const requisitionData = {
      expenseCategory,
      expenseClass: expenseCategory === "Other" ? "Miscellaneous" : expenseClass,
      expenseType: expenseCategory === "Other" ? "Please specify in description" : finalExpenseType,
      requestedBy: currentUser.name,
      supplierName: formData.supplierName,
      // Remove supplierPhone from top level - it will be in items
      createdBy: currentUser.name,
      totalAmount: calculateTotal(),
      items: items.map(item => ({
          productName: item.name,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          // Include supplierPhone in each item for outsourced items
          ...(isOutsourcedItems && supplierPhoneValue && { supplierPhone: supplierPhoneValue })
      })),
      notes: formData.notes
    };

    // Persist current user for other modules to read
    try { sessionStorage.setItem('currentUserName', currentUser.name); } catch {}

    onAction('create', requisitionData);

    // Generate Purchase Order PDF for outsourced items
    if (isOutsourcedItems) {
      generatePurchaseOrderPDF(requisitionData);
    } else {
      // Regular requisition print view
      generateRequisitionPrintView(requisitionData);
    }

    // Reset form
    setExpenseCategory('');
    setExpenseClass('');
    setExpenseType('');
    setOtherType('');
    setFormData({ supplierName: '', supplierPhone: '', notes: '' }); // Remove invoiceId
    setItems([{ name: '', quantity: 1, unitPrice: 0, description: '' }]);
    setOpen(false);
  };

  // Generate Purchase Order PDF (for outsourced items)
  const generatePurchaseOrderPDF = async (requisitionData: any) => {
    try {
      await ensureHtml2PdfLoaded();
      
      // Extract supplier phone from items (first item should have it)
      const firstItem = requisitionData.items?.[0];
      const supplierPhoneValue = firstItem?.supplierPhone || '';
      
      const itemsRows = (requisitionData.items || []).map((it: any) => {
        const qty = Number(it.quantity || 0);
        const price = Number(it.unitPrice || 0);
        const total = (qty * price).toLocaleString();
        const name = it.productName || it.name || '-';
        const desc = it.description ? ` - ${it.description}` : '';
        return `<tr><td style="padding:6px;border-bottom:1px solid #f2f2f2">${name}${desc}</td><td style="text-align:right;padding:6px;border-bottom:1px solid #f2f2f2">${qty}</td><td style="text-align:right;padding:6px;border-bottom:1px solid #f2f2f2">${price.toLocaleString()}</td><td style="text-align:right;padding:6px;border-bottom:1px solid #f2f2f2">${total}</td></tr>`;
      }).join('');

      const totalAmount = Number(requisitionData.totalAmount || 0).toLocaleString();
      const poId = `PO-${Date.now()}`;

      const container = document.createElement('div');
      container.style.width = '210mm';
      container.style.padding = '12mm';
      container.style.background = '#fff';
      container.style.color = '#000';

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ddd;padding-bottom:8px">
          <div><h2 style="margin:0;font-family:ui-sans-serif,system-ui">Purchase Order</h2><small style="color:#666">Generated ${new Date().toLocaleString()}</small></div>
          <img src="/logo.png" alt="Company" style="height:40px"/>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px">
          <div>
            <div><strong>PO No:</strong> ${poId}</div>
            <div><strong>Supplier:</strong> ${requisitionData.supplierName || '-'}</div>
            ${supplierPhoneValue ? `<div><strong>Supplier Phone:</strong> ${supplierPhoneValue}</div>` : ''}
            <div><strong>Requested By:</strong> ${requisitionData.requestedBy || requisitionData.createdBy || '-'}</div>
          </div>
          <div style="text-align:right">
            <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
            <div><strong>Created By:</strong> ${requisitionData.createdBy || '-'}</div>
            <div><strong>Status:</strong> Pending Approval</div>
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
      
      toast.success("Requisition and Purchase Order created", {
        description: "Purchase Order PDF has been generated and downloaded."
      });
    } catch (err) {
      console.error('Failed to generate Purchase Order PDF:', err);
      toast.error("Failed to generate Purchase Order PDF");
    }
  };

  // Keep existing requisition print view generation
  const generateRequisitionPrintView = (requisitionData: any) => {
    try {
      const itemsRows = (requisitionData.items || []).map((it: any) => {
        const qty = Number(it.quantity || 0);
        const price = Number(it.unitPrice || 0);
        const total = qty * price;
        const name = it.productName || it.name;
        const desc = it.description ? ` - ${it.description}` : '';
        return `<tr><td>${name}${desc}</td><td class="num">${qty}</td><td class="num">${price.toLocaleString()}</td><td class="num">${total.toLocaleString()}</td></tr>`;
      }).join("");

      const total = Number(requisitionData.totalAmount || 0).toLocaleString();

      const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Requisition</title>
<style>body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto;}
@page{size:A4;margin:12mm;} .wrap{width:210mm;min-height:297mm;padding:12mm;margin:0 auto;background:#fff;color:#000}
.hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ddd;padding-bottom:8px}
small{color:#666} table{width:100%;border-collapse:collapse;margin-top:12px} th,td{padding:6px;border-bottom:1px solid #eee}
th{text-align:left} td.num{text-align:right}
.section{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px}
.sign{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:28px}
.box{height:64px;border-bottom:1px solid #000}
</style></head><body>
<div class="wrap">
  <div class="hdr"><div><h2>Requisition</h2><small>Generated ${new Date().toLocaleString()}</small></div><img src="/logo.png" alt="Company" style="height:40px"/></div>
  <div class="section">
    <div>
      <div><strong>Requested By:</strong> ${requisitionData.requestedBy}</div>
      <div><strong>Supplier:</strong> ${requisitionData.supplierName}</div>
      <div><strong>Notes:</strong> ${requisitionData.notes || '-'}</div>
    </div>
    <div style="text-align:right">
      <div><strong>Reference:</strong> ${Date.now()}</div>
      <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
      <div><strong>Status:</strong> Pending Approval</div>
    </div>
  </div>
  <table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Total</th></tr></thead>
    <tbody>${itemsRows}</tbody>
    <tfoot><tr><td colspan="3" style="text-align:right"><strong>Total</strong></td><td class="num"><strong>${total}</strong></td></tr></tfoot>
  </table>
  <div class="sign"><div><div><strong>Requested By</strong></div><div class="box"></div><small>Signature / Date</small></div>
       <div><div><strong>Approved By</strong></div><div class="box"></div><small>Signature / Date</small></div></div>
</div>
<script>window.addEventListener('load',()=>{document.title='Requisition';});</script>
</body></html>`;

      const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      toast.success("Requisition created", {
        description: (
          <a href={blobUrl} target="_blank" rel="noopener" className="underline">
            Open print view in new tab
          </a>
        )
      });
      setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
    } catch (err) {
      console.error('Failed to prepare print view:', err);
    }
  };

  // Add html2pdf loader function
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
          {/* Expense Classification Section */}
          <Card>
            <CardContent className="pt-4">
              <h3 className="text-lg font-semibold mb-4">Expense Classification</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Expense Category */}
                <div className="space-y-2">
                  <Label htmlFor="expenseCategory">Expense Category *</Label>
                  <Select value={expenseCategory} onValueChange={handleCategoryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(expenseData).map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Expense Class */}
                <div className="space-y-2">
                  <Label htmlFor="expenseClass">Expense Class *</Label>
                  <Select 
                    value={expenseClass} 
                    onValueChange={handleClassChange}
                    disabled={!expenseCategory || isOtherCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableClasses().map(expenseClass => (
                        <SelectItem key={expenseClass} value={expenseClass}>{expenseClass}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Expense Type */}
                <div className="space-y-2">
                  <Label htmlFor="expenseType">Expense Type *</Label>
                  <Select 
                    value={expenseType} 
                    onValueChange={handleTypeChange}
                    disabled={!expenseClass || isOtherCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableTypes().map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Other Type Input */}
              {isOtherType && (
                <div className="mt-4 space-y-2">
                  <Label htmlFor="otherType">Please Specify Type *</Label>
                  <Input
                    id="otherType"
                    value={otherType}
                    onChange={(e) => setOtherType(e.target.value)}
                    placeholder="Enter specific expense type"
                    required
                  />
                </div>
              )}

              {/* Special handling for "Other" category */}
              {isOtherCategory && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    For "Other" category, please specify the expense details in the description field below.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="requestedBy">Requested By *</Label>
              <Input
                id="requestedBy"
                value={currentUser.name}
                onChange={(e) => {}}
                placeholder="Enter requester's name"
                required
                disabled
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="supplier">{supplierLabel} *</Label>
              <Input
                id="supplier"
                value={formData.supplierName}
                onChange={(e) => setFormData({...formData, supplierName: e.target.value})}
                placeholder={supplierPlaceholder}
                required
              />
            </div>
          </div>

          {/* Supplier Phone - Only for Outsourced Items */}
          {isOutsourcedItems && (
            <div className="space-y-2">
              <Label htmlFor="supplierPhone">
                <Phone className="inline h-4 w-4 mr-1" />
                Supplier Phone *
              </Label>
              <Input
                id="supplierPhone"
                type="tel"
                value={formData.supplierPhone}
                onChange={(e) => setFormData({...formData, supplierPhone: e.target.value.replace(/\D/g, "").slice(0, 10)})}
                placeholder="07XXXXXXXX"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                required
              />
            </div>
          )}

          {/* Items Section */}
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
                      <Label htmlFor={`item-name-${index}`}>
                        {isFieldFacilitation ? "Item Description" : "Item Name"} *
                      </Label>
                      <Input 
                        id={`item-name-${index}`} 
                        value={item.name} 
                        onChange={(e) => updateItem(index, 'name', e.target.value)} 
                        placeholder={isFieldFacilitation ? "Describe the item or service" : "Enter item name"}
                        required 
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor={`item-qty-${index}`}>Quantity *</Label>
                      <Input 
                        id={`item-qty-${index}`} 
                        type="number" 
                        min="1" 
                        value={item.quantity} 
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} 
                        required 
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor={`item-price-${index}`}>Unit Price (Ksh) *</Label>
                      <Input 
                        id={`item-price-${index}`} 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        value={item.unitPrice} 
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)} 
                        required 
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label>Total</Label>
                      <Input value={`Ksh ${(item.quantity * item.unitPrice).toLocaleString()}`} disabled className="bg-muted" />
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      {items.length > 1 && (
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeItem(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Label htmlFor={`item-desc-${index}`}>Description</Label>
                    <Textarea 
                      id={`item-desc-${index}`} 
                      value={item.description} 
                      onChange={(e) => updateItem(index, 'description', e.target.value)} 
                      placeholder="Optional item description" 
                      rows={2} 
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea 
              id="notes" 
              value={formData.notes} 
              onChange={(e) => setFormData({...formData, notes: e.target.value})} 
              placeholder="Optional notes or special instructions" 
              rows={3} 
            />
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