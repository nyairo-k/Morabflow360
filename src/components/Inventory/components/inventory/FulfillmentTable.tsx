import { useState, useMemo, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/Inventory/components/ui/table";
import { Button } from "@/components/Inventory/components/ui/button";
import { Checkbox } from "@/components/Inventory/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Inventory/components/ui/select";
import { Badge } from "@/components/Inventory/components/ui/badge";
import { Input } from "@/components/Inventory/components/ui/input";
import { Textarea } from "@/components/Inventory/components/ui/textarea";
import { Switch } from "@/components/Inventory/components/ui/switch";
import { Package, Building, User, ShoppingCart, Calendar, Eye, Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { BulkAssignmentActions } from "./BulkAssignmentActions";
import { PurchaseOrderDialog } from "./PurchaseOrderDialog";
import type { InvoiceLineItem, FulfillmentSource, FieldRep, Supplier, Invoice, PurchaseOrder, FulfillmentSplit } from "@/components/Inventory/types/inventory";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from "@/components/Inventory/components/ui/pagination";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/Inventory/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Inventory/components/ui/popover";
import { cn } from "@/lib/utils";
import { cfg } from "@/lib/config";
import { toast } from "sonner"; // Add this import if not already present

// ====== 1. UPDATE THE PROPS INTERFACE ======
interface FulfillmentTableProps {
  lineItems: InvoiceLineItem[];
  invoiceId: string;
  onLineItemUpdate?: (itemId: string, updates: Partial<InvoiceLineItem>) => void;
  onSplitUpdate?: (itemId: string, splitId: string, updates: Partial<FulfillmentSplit>) => void;
  onSplitQuantityChange?: (itemId: string, splitId: string, quantity: number) => void;
  onSplitAdd?: (itemId: string, preferredQuantity?: number) => void;
  onSplitRemove?: (itemId: string, splitId: string) => void;
  onSkipToggle?: (itemId: string, skip: boolean) => void;
  onAction: (action: string, data: any) => void;
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[]; // Add this
  fieldReps: FieldRep[]; // It now receives the live list of field reps
  readOnly?: boolean; // Add this
}

export function FulfillmentTable({ 
  lineItems, 
  invoiceId, 
  onLineItemUpdate,
  onSplitUpdate,
  onSplitQuantityChange,
  onSplitAdd,
  onSplitRemove,
  onSkipToggle,
  onAction,
  suppliers,
  purchaseOrders, // Add this
  fieldReps = [], // Receive the new prop and default to an empty array
  readOnly = false // Add this
}: FulfillmentTableProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [poDialogOpen, setPODialogOpen] = useState(false);
  const [selectedItemForPO, setSelectedItemForPO] = useState<InvoiceLineItem | null>(null);
  const [selectedSplitContext, setSelectedSplitContext] = useState<{ itemId: string; splitId: string } | null>(null);
  
  // NEW: Store POs in memory when created (until dispatch is submitted)
  const [localPOMap, setLocalPOMap] = useState<Record<string, any>>({});
  
  // NEW: State for product autocomplete
  const [productsCache, setProductsCache] = useState<Record<string, Array<{id: string, name: string, quantity: number}>>>({});
  const [loadingProducts, setLoadingProducts] = useState<string>('');
  const [openComboboxes, setOpenComboboxes] = useState<Record<string, boolean>>({});
  const [productSearchValue, setProductSearchValue] = useState<Record<string, string>>({});
  const [splitQuantityDrafts, setSplitQuantityDrafts] = useState<Record<string, string>>({});

  const canEdit = !readOnly;
  const safeLineItemUpdate = onLineItemUpdate || (() => {});
  const safeSplitUpdate = onSplitUpdate || (() => {});
  const safeSplitQuantityChange = onSplitQuantityChange || (() => {});
  const safeSplitAdd = onSplitAdd || (() => {});
  const safeSplitRemove = onSplitRemove || (() => {});
  const safeSkipToggle = onSkipToggle || (() => {});

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20; // adjust if needed
  const totalPages = Math.max(1, Math.ceil((lineItems?.length || 0) / pageSize));

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return (lineItems || []).slice(start, start + pageSize);
  }, [lineItems, page, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  useEffect(() => {
    setSplitQuantityDrafts((prev) => {
      const validIds = new Set<string>();
      lineItems.forEach((item) => {
        item.fulfillmentSplits?.forEach((split) => validIds.add(split.id));
      });

      let changed = false;
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (!validIds.has(key)) {
          delete next[key];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [lineItems]);

  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItems(prev => 
      checked ? [...prev, itemId] : prev.filter(id => id !== itemId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(checked ? lineItems.map(item => item.id) : []);
  };

  const handleBulkAssignment = (source: FulfillmentSource) => {
    if (!selectedItems.length) return;

    lineItems
      .filter((item) => selectedItems.includes(item.id) && !item.skipFulfillment)
      .forEach((item) => {
        const splits = item.fulfillmentSplits ?? [];
        if (splits.length === 0) return;
        splits.forEach((split) => {
          safeSplitUpdate(item.id, split.id, {
            fulfillmentSource: source,
            serialNumbers: [],
            assignedLocation: source === "MAIN_HQ" ? "Main HQ" : source === "NYAMIRA" ? "Nyamira" : undefined,
            assignedRep: undefined,
            poId: undefined,
          });
        });
      });

    setSelectedItems([]);
  };

  // NEW: Function to fetch products for a location
  const fetchProductsForLocation = async (locationName: string, repName?: string) => {
    const cacheKey = repName ? `${locationName}-${repName}` : locationName;
    
    if (productsCache[cacheKey]) {
      return productsCache[cacheKey];
    }
    
    setLoadingProducts(cacheKey);
    try {
      const response = await fetch(cfg.inventoryScript, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'getProductsForLocation',
          data: { locationName, repName: repName || null }
        })
      });
      const result = await response.json();
      
      if (result.status === 'success' && result.products) {
        setProductsCache(prev => ({ ...prev, [cacheKey]: result.products }));
        return result.products;
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoadingProducts('');
    }
    return [];
  };

  // MODIFIED: Update source change handler to fetch products per split
  const handleSplitSourceChange = async (itemId: string, split: FulfillmentSplit, source: FulfillmentSource) => {
    const locationMap: Record<string, string> = {
      MAIN_HQ: "Inventory - Main HQ",
      NYAMIRA: "Inventory - Nyamira Branch",
      FIELD_REP: "Inventory - Field Reps",
    };

    const locationName = locationMap[source];
    if (locationName && source !== "FIELD_REP") {
      await fetchProductsForLocation(locationName);
    }

    safeSplitUpdate(itemId, split.id, {
      fulfillmentSource: source,
      serialNumbers: [],
      assignedLocation: source === "MAIN_HQ" ? "Main HQ" : source === "NYAMIRA" ? "Nyamira" : undefined,
      assignedRep: undefined,
      poId: undefined,
    });
  };

  // NEW: Handle Field Rep selection - fetch products for that rep
  const handleSplitRepChange = async (itemId: string, splitId: string, repName: string) => {
    safeSplitUpdate(itemId, splitId, { assignedRep: repName });
    await fetchProductsForLocation("Inventory - Field Reps", repName);
  };

  // NEW: Handle product selection from autocomplete
  const handleProductSelect = (itemId: string, splitId: string, productId: string, productName: string) => {
    safeSplitUpdate(itemId, splitId, {
      serialNumbers: [productId],
    });

    setProductSearchValue((prev) => ({ ...prev, [splitId]: productName }));
    setOpenComboboxes((prev) => ({ ...prev, [splitId]: false }));
  };

  const getSplitQuantityInputValue = (split: FulfillmentSplit) =>
    splitQuantityDrafts[split.id] ??
    (typeof split.quantity === "number" && !Number.isNaN(split.quantity) ? String(split.quantity) : "");

  const handleSplitQuantityInputChange = (itemId: string, splitId: string, value: string) => {
    if (!/^\d*$/.test(value)) return;
    setSplitQuantityDrafts((prev) => ({ ...prev, [splitId]: value }));
    if (value === "") {
      return;
    }
    safeSplitQuantityChange(itemId, splitId, Number(value));
  };

  const commitSplitQuantity = (itemId: string, splitId: string) => {
    setSplitQuantityDrafts((prev) => {
      if (!(splitId in prev)) {
        return prev;
      }
      const next = { ...prev };
      const rawValue = next[splitId];
      delete next[splitId];

      if (rawValue && rawValue !== "" && /^\d+$/.test(rawValue)) {
        safeSplitQuantityChange(itemId, splitId, Number(rawValue));
      }

      return next;
    });
  };

  const handleCreatePO = (item: InvoiceLineItem, split: FulfillmentSplit) => {
    setSelectedItemForPO({
      ...item,
      quantity: split.quantity ?? 1,
      assignedSupplierName: split.assignedSupplierName,
      assignedSupplierPhone: split.assignedSupplierPhone,
      fulfillmentSource: "OUTSOURCE",
    });
    setSelectedSplitContext({ itemId: item.id, splitId: split.id });
    setPODialogOpen(true);
  };

  // Lazy-load html2pdf.js from CDN once for client-side PDF generation
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

  // Generate and download a PDF for an existing PO using html2pdf
  const downloadPOPdf = async (poData: any) => {
    try {
      await ensureHtml2PdfLoaded();
      
      const qty = Number(poData.quantity || 0);
      const totalPurchasePrice = Number(poData.purchasePrice || 0);
      const unitPrice = qty > 0 ? totalPurchasePrice / qty : 0;
      const total = totalPurchasePrice.toLocaleString();

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
            <div><strong>PO No:</strong> ${poData.poId}</div>
            <div><strong>Supplier:</strong> ${poData.supplierName || '-'}</div>
            <div><strong>Phone:</strong> ${poData.supplierPhone || '-'}</div>
          </div>
          <div style="text-align:right">
            <div><strong>Date:</strong> ${(poData.createdDate ? new Date(poData.createdDate) : new Date()).toLocaleDateString()}</div>
            <div><strong>Invoice Ref:</strong> ${poData.relatedInvoiceId || '-'}</div>
            <div><strong>Created By:</strong> ${poData.createdBy || '-'}</div>
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
          <tbody>
            <tr>
              <td style="padding:6px;border-bottom:1px solid #f2f2f2">${poData.productName || '-'}</td>
              <td style="text-align:right;padding:6px;border-bottom:1px solid #f2f2f2">${qty}</td>
              <td style="text-align:right;padding:6px;border-bottom:1px solid #f2f2f2">${unitPrice.toLocaleString()}</td>
              <td style="text-align:right;padding:6px;border-bottom:1px solid #f2f2f2">${total}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align:right;padding:6px"><strong>Total</strong></td>
              <td style="text-align:right;padding:6px"><strong>${total}</strong></td>
            </tr>
          </tfoot>
        </table>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px">
          <div><div><strong>Authorized By</strong></div><div style="height:64px;border-bottom:1px solid #000"></div><small>Signature / Date</small></div>
          <div><div><strong>Supplier Acceptance</strong></div><div style="height:64px;border-bottom:1px solid #000"></div><small>Signature / Date</small></div>
        </div>
      `;

      const opt = {
        margin:       0,
        filename:     `${poData.poId || 'purchase_order'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      } as any;

      (window as any).html2pdf().set(opt).from(container).save();
    } catch {
      // Silent failure; avoids blocking fulfillment flow
    }
  };

  // Build a lightweight printable HTML for an existing PO and open in new tab
  const openPOPrintView = (poData: any) => {
    try {
      const qty = Number(poData.quantity || 0);
      const totalPurchasePrice = Number(poData.purchasePrice || 0);
      const unitPrice = qty > 0 ? totalPurchasePrice / qty : 0;
      const total = totalPurchasePrice.toLocaleString();

      const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Purchase Order</title>
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
  <div class="hdr"><div><h2>Purchase Order</h2><small>Generated ${new Date().toLocaleString()}</small></div><img src="/logo.png" alt="Company" style="height:40px"/></div>
  <div class="section">
    <div>
      <div><strong>PO No:</strong> ${poData.poId}</div>
      <div><strong>Supplier:</strong> ${poData.supplierName || '-'}</div>
      <div><strong>Phone:</strong> ${poData.supplierPhone || '-'}</div>
    </div>
    <div style="text-align:right">
      <div><strong>Date:</strong> ${(poData.createdDate ? new Date(poData.createdDate) : new Date()).toLocaleDateString()}</div>
      <div><strong>Invoice Ref:</strong> ${poData.relatedInvoiceId || '-'}</div>
      <div><strong>Created By:</strong> ${poData.createdBy || '-'}</div>
    </div>
  </div>
  <table><thead><tr><th>Product</th><th class="num">Qty</th><th class="num">Unit Cost</th><th class="num">Total</th></tr></thead>
    <tbody><tr><td>${poData.productName || '-'}</td><td class="num">${qty}</td><td class="num">${unitPrice.toLocaleString()}</td><td class="num">${total}</td></tr></tbody>
    <tfoot><tr><td colspan="3" style="text-align:right"><strong>Total</strong></td><td class="num"><strong>${total}</strong></td></tr></tfoot>
  </table>
  <div class="sign"><div><div><strong>Authorized By</strong></div><div class="box"></div><small>Signature / Date</small></div>
       <div><div><strong>Supplier Acceptance</strong></div><div class="box"></div><small>Signature / Date</small></div></div>
</div>
<script>window.addEventListener('load',()=>{document.title='Purchase Order';});</script>
</body></html>`;

      const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      window.open(blobUrl, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
    } catch {
      // no-op; keep UX silent here
    }
  };

  // Resolve the PO data for a given line item from current state
  const resolvePOForSplit = (item: InvoiceLineItem, split: FulfillmentSplit) => {
    if (split.poId && localPOMap[split.poId]) {
      return localPOMap[split.poId];
    }

    const existing = purchaseOrders?.find((po) => {
      const poPoId = String(po.poId || "").trim();
      const splitPoId = String(split.poId || "").trim();
      return poPoId === splitPoId;
    });

    if (existing) {
      return existing;
    }

    return {
      poId: split.poId,
      supplierName: split.assignedSupplierName,
      supplierPhone: split.assignedSupplierPhone,
      purchasePrice: 0,
      relatedInvoiceId: invoiceId,
      productName: item.productName,
      quantity: split.quantity,
      createdDate: new Date().toISOString(),
      createdBy: (typeof window !== 'undefined' && sessionStorage.getItem('currentUserName')) || 'Current User'
    };
  };

  const handlePOCreated = (poData: any) => {
    if (selectedItemForPO && selectedSplitContext) {
      // Calculate total purchase price (unit * quantity)
      const totalPurchasePrice = (Number(poData.purchasePrice) || 0) * selectedItemForPO.quantity;
      const totalSellingPrice = selectedItemForPO.unitPrice * selectedItemForPO.quantity;
      
      // Store complete PO data in memory
      const completePOData = {
        ...poData,
        poId: poData.poId,
        relatedInvoiceId: invoiceId,
        productId: selectedItemForPO.productId,
        productName: selectedItemForPO.productName,
        quantity: selectedItemForPO.quantity,
        purchasePrice: totalPurchasePrice, // Store as TOTAL
        sellingPrice: totalSellingPrice, // Store as TOTAL
        supplierName: poData.supplierName,
        supplierPhone: poData.supplierPhone,
        createdDate: new Date().toISOString(),
        createdBy: (typeof window !== 'undefined' && sessionStorage.getItem('currentUserName')) || 'Current User',
        paymentStatusToSupplier: 'UNPAID'
      };
      
      // Store in local memory for PDF generation
      setLocalPOMap(prev => ({
        ...prev,
        [poData.poId]: completePOData
      }));
      
      // Update the local line item WITHOUT triggering a full refresh
      safeSplitUpdate(selectedSplitContext.itemId, selectedSplitContext.splitId, {
        poId: poData.poId,
        fulfillmentSource: 'OUTSOURCE',
        assignedSupplierName: poData.supplierName,
        assignedSupplierPhone: poData.supplierPhone,
      });
      
      // Create the PO in the background without refreshing the UI
      onAction('createPurchaseOrder', completePOData);
    }
    setPODialogOpen(false);
    setSelectedItemForPO(null);
    setSelectedSplitContext(null);
  };

  const handlePOClose = () => {
    setPODialogOpen(false);
    setSelectedItemForPO(null);
    setSelectedSplitContext(null);
  };

  // Clear local POs when dispatch is submitted (called from parent)
  useEffect(() => {
    // This will be triggered when parent refreshes data after submit
    // Local POs will be replaced by database POs
  }, [purchaseOrders]);

  const getAllocatedQuantity = (item: InvoiceLineItem) =>
    (item.fulfillmentSplits ?? []).reduce((sum, split) => sum + (split.quantity || 0), 0);

  const getRemainingQuantity = (item: InvoiceLineItem) =>
    Math.max(item.quantity - getAllocatedQuantity(item), 0);

  const isSplitReady = (split: FulfillmentSplit) => {
    if (!split.fulfillmentSource) return false;
    if ((split.quantity ?? 0) <= 0) return false;

    switch (split.fulfillmentSource) {
      case "MAIN_HQ":
      case "NYAMIRA":
        return true;
      case "FIELD_REP":
        return !!split.assignedRep;
      case "OUTSOURCE":
        return !!split.poId;
      default:
        return false;
    }
  };

  const getSourceIcon = (source: FulfillmentSource) => {
    switch (source) {
      case 'MAIN_HQ':
      case 'NYAMIRA':
        return <Building className="h-4 w-4" />;
      case 'FIELD_REP':
        return <User className="h-4 w-4" />;
      case 'OUTSOURCE':
        return <ShoppingCart className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getSourceLabel = (source: FulfillmentSource) => {
    switch (source) {
      case 'MAIN_HQ':
        return 'Main HQ Store';
      case 'NYAMIRA':
        return 'Nyamira Store';
      case 'FIELD_REP':
        return 'Field Rep Stock';
      case 'OUTSOURCE':
        return 'Outsource';
      default:
        return 'Not Assigned';
    }
  };

  const renderSplitProductPicker = (
    itemId: string,
    cacheKey: string,
    splitId: string,
    products: Array<{ id: string; name: string; quantity: number }>,
    selectedProductId: string,
    placeholder = "Search product..."
  ) => {
    const selectedProduct = products.find((p) => p.id === selectedProductId);
    const isOpen = openComboboxes[splitId] || false;
    const searchValue = productSearchValue[splitId] || "";

    return (
      <Popover
        open={isOpen && !readOnly}
        onOpenChange={(open) => !readOnly && setOpenComboboxes((prev) => ({ ...prev, [splitId]: open }))}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={readOnly}
            aria-expanded={isOpen}
            className="w-full h-8 justify-between text-xs"
          >
            {selectedProduct ? (
              <span className="truncate">{selectedProduct.name}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search product..."
              value={searchValue}
              onValueChange={(value) => setProductSearchValue((prev) => ({ ...prev, [splitId]: value }))}
            />
            <CommandList>
              <CommandEmpty>
                {loadingProducts === cacheKey ? "Loading..." : "No products found."}
              </CommandEmpty>
              <CommandGroup>
                {products
                  .filter(
                    (product) =>
                      !searchValue ||
                      product.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                      product.id.toLowerCase().includes(searchValue.toLowerCase())
                  )
                  .map((product) => (
                    <CommandItem
                      key={product.id}
                      value={product.id}
                      onSelect={() => handleProductSelect(itemId, splitId, product.id, product.name)}
                      disabled={readOnly}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedProductId === product.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm">{product.name}</span>
                        <span className="text-xs text-muted-foreground">ID: {product.id}</span>
                        <span className="text-xs text-muted-foreground">Qty: {product.quantity}</span>
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  const renderSplitAssignmentDetails = (item: InvoiceLineItem, split: FulfillmentSplit) => {
    if (!split.fulfillmentSource) {
      return <p className="text-xs text-muted-foreground">Select a source to add details.</p>;
    }

    switch (split.fulfillmentSource) {
      case "MAIN_HQ":
      case "NYAMIRA": {
        const locationName =
          split.fulfillmentSource === "MAIN_HQ" ? "Inventory - Main HQ" : "Inventory - Nyamira Branch";
        const cacheKey = locationName;
        const products = productsCache[cacheKey] || [];
        const selectedProductId = split.serialNumbers?.[0] || "";

        if (!productsCache[cacheKey] && !loadingProducts) {
          fetchProductsForLocation(locationName);
        }

        return renderSplitProductPicker(item.id, cacheKey, split.id, products, selectedProductId);
      }

      case "FIELD_REP": {
        const cacheKey = split.assignedRep ? `Inventory - Field Reps-${split.assignedRep}` : "";
        const products = split.assignedRep ? productsCache[cacheKey] || [] : [];
        const selectedProductId = split.serialNumbers?.[0] || "";

        if (split.assignedRep && !productsCache[cacheKey] && !loadingProducts) {
          fetchProductsForLocation("Inventory - Field Reps", split.assignedRep);
        }

        return (
          <div className="space-y-2">
            <Select
              value={split.assignedRep || ""}
              onValueChange={(value) => handleSplitRepChange(item.id, split.id, value)}
              disabled={readOnly}
            >
              <SelectTrigger className="h-8 text-xs" disabled={readOnly}>
                <SelectValue placeholder="Select rep..." />
              </SelectTrigger>
              <SelectContent>
                {fieldReps.map((rep) => (
                  <SelectItem key={rep.id} value={rep.name}>
                    {rep.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {split.assignedRep
              ? renderSplitProductPicker(item.id, cacheKey, split.id, products, selectedProductId)
              : (
                <p className="text-xs text-muted-foreground">
                  Select a rep to view available inventory.
                </p>
              )}
          </div>
        );
      }

      case "OUTSOURCE": {
        const supplierName = split.assignedSupplierName || "Unknown Supplier";
        return (
          <div className="flex items-center gap-2 flex-wrap">
            {split.poId ? (
              <>
                <Badge variant="success" className="text-xs">
                  {supplierName}
                </Badge>
                <Button
                  onClick={() => downloadPOPdf(resolvePOForSplit(item, split))}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                >
                  Download PDF
                </Button>
                <Button
                  onClick={() => openPOPrintView(resolvePOForSplit(item, split))}
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                >
                  Print View
                </Button>
              </>
            ) : (
              <Button
                onClick={() => handleCreatePO(item, split)}
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={readOnly}
              >
                Create PO
              </Button>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  const renderFulfillmentPlan = (item: InvoiceLineItem) => {
    if (item.skipFulfillment) {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 space-y-3">
          <p className="text-sm font-semibold text-amber-800">No fulfillment required</p>
          <Select
            value={item.nonFulfillmentReason || ""}
            onValueChange={(value) => safeLineItemUpdate(item.id, { nonFulfillmentReason: value })}
            disabled={readOnly}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select reason (e.g. Transport)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Transport">Transport</SelectItem>
              <SelectItem value="Installation">Installation</SelectItem>
              <SelectItem value="Insurance">Insurance</SelectItem>
              <SelectItem value="Other">Other / Service</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            value={item.nonFulfillmentNotes || ""}
            onChange={(event) => safeLineItemUpdate(item.id, { nonFulfillmentNotes: event.target.value })}
            placeholder="Optional notes (vendor, schedule, etc.)"
            disabled={readOnly}
            className="text-sm"
          />
        </div>
      );
    }

    const splits = item.fulfillmentSplits ?? [];
    const remainingQty = getRemainingQuantity(item);

    if (splits.length === 0) {
      return (
        <div className="rounded border border-dashed p-3 text-xs text-muted-foreground">
          No splits defined yet.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {splits.map((split, index) => (
          <div key={split.id} className="rounded-lg border bg-white p-3 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Split {index + 1}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Qty</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    max={item.quantity}
                    value={getSplitQuantityInputValue(split)}
                    onChange={(event) =>
                      handleSplitQuantityInputChange(item.id, split.id, event.target.value)
                    }
                    onBlur={() => commitSplitQuantity(item.id, split.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        (event.target as HTMLInputElement).blur();
                      }
                    }}
                    disabled={readOnly}
                    className="h-8 w-20 text-xs"
                  />
                </div>
                {splits.length > 1 && !readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => safeSplitRemove(item.id, split.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>

            <Select
              value={split.fulfillmentSource || ""}
              onValueChange={(value: FulfillmentSource) =>
                handleSplitSourceChange(item.id, split, value)
              }
              disabled={readOnly}
            >
              <SelectTrigger className="w-full h-9" disabled={readOnly}>
                <SelectValue>
                  {split.fulfillmentSource ? (
                    <div className="flex items-center gap-2 text-gray-900">
                      {getSourceIcon(split.fulfillmentSource)}
                      <span className="text-xs font-medium">{getSourceLabel(split.fulfillmentSource)}</span>
                    </div>
                  ) : (
                    "Select source..."
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MAIN_HQ">
                  <div className="flex items-center gap-2 text-gray-900">
                    <Building className="h-4 w-4 text-gray-700" />
                    <span className="text-sm">Main HQ Store</span>
                  </div>
                </SelectItem>
                <SelectItem value="NYAMIRA">
                  <div className="flex items-center gap-2 text-gray-900">
                    <Building className="h-4 w-4 text-gray-700" />
                    <span className="text-sm">Nyamira Store</span>
                  </div>
                </SelectItem>
                <SelectItem value="FIELD_REP">
                  <div className="flex items-center gap-2 text-gray-900">
                    <User className="h-4 w-4 text-gray-700" />
                    <span className="text-sm">Field Rep Stock</span>
                  </div>
                </SelectItem>
                <SelectItem value="OUTSOURCE">
                  <div className="flex items-center gap-2 text-gray-900">
                    <ShoppingCart className="h-4 w-4 text-gray-700" />
                    <span className="text-sm">Outsource from Supplier</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {renderSplitAssignmentDetails(item, split)}
          </div>
        ))}

        {!readOnly && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                if (remainingQty <= 0) {
                  toast.warning("All quantity already distributed.");
                  return;
                }
                safeSplitAdd(item.id, remainingQty);
              }}
              disabled={remainingQty <= 0}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add split
            </Button>
            <span className={cn("font-medium", remainingQty === 0 ? "text-green-600" : "text-amber-600")}>
              {remainingQty === 0 ? "All units allocated" : `${remainingQty} units unassigned`}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4">
        <BulkAssignmentActions
          selectedCount={selectedItems.length}
          onBulkAssign={handleBulkAssignment}
          onClearSelection={() => setSelectedItems([])}
          readOnly={readOnly}
        />

        <div className="rounded-xl border bg-white shadow-sm">
          <div className="px-4 py-3 border-b bg-gray-50/60 rounded-t-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Product SourceAssignment</p>
              <div className="text-xs text-muted-foreground">Select and assign sourcedetails</div>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/60">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedItems.length > 0 && selectedItems.length === lineItems.length}
                    onCheckedChange={handleSelectAll}
                    disabled={readOnly}
                  />
                </TableHead>
                <TableHead className="font-medium text-gray-700">Product</TableHead>
                <TableHead className="font-medium text-gray-700">Qty</TableHead>
                <TableHead className="font-medium text-gray-700">Unit Price</TableHead>
                <TableHead className="font-medium text-gray-700">Total</TableHead>
                <TableHead className="font-medium text-gray-700">Fulfillment Plan</TableHead>
                <TableHead className="font-medium text-gray-700 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map((item) => {
                const isComplete = item.skipFulfillment
                  ? true
                  : (item.fulfillmentSplits ?? []).length > 0 &&
                    getRemainingQuantity(item) === 0 &&
                    (item.fulfillmentSplits ?? []).every(isSplitReady);

                return (
                  <TableRow key={item.id} className="hover:bg-gray-50/60 transition-colors">
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                        disabled={readOnly}
                      />
                    </TableCell>
                    <TableCell className="space-y-2">
                      <div className="space-y-0.5">
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        <p className="text-xs text-gray-500 font-mono">{item.productId}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!item.skipFulfillment}
                          onCheckedChange={(checked) => safeSkipToggle(item.id, !checked)}
                          disabled={readOnly}
                        />
                        <span className="text-xs text-muted-foreground">
                          {item.skipFulfillment ? "Service / Transport" : "Requires fulfillment"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-gray-900">
                      {item.quantity}
                      {!item.skipFulfillment && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Allocated {getAllocatedQuantity(item)}/{item.quantity}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-gray-900">KSh {item.unitPrice.toLocaleString()}</TableCell>
                    <TableCell className="font-mono font-semibold text-gray-900">
                      KSh {(item.quantity * item.unitPrice).toLocaleString()}
                    </TableCell>
                    <TableCell className="min-w-[320px]">
                      {renderFulfillmentPlan(item)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={isComplete ? "success" : "secondary"}
                        className={isComplete ? "bg-green-100 text-green-800 border-green-200" : "bg-amber-100 text-amber-800 border-amber-200"}
                      >
                        {isComplete ? "Ready" : "Pending"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="pt-3">
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

      {selectedItemForPO && (
        <PurchaseOrderDialog
          open={poDialogOpen}
          onClose={handlePOClose}
          lineItem={selectedItemForPO}
          invoiceId={invoiceId}
          // This is the one crucial change: passing the live suppliers prop
          suppliers={suppliers}
          onPOCreated={handlePOCreated}
          onAction={onAction}
        />
      )}
    </>
  );
}