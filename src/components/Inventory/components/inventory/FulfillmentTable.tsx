import { useState, useMemo, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/Inventory/components/ui/table";
import { Button } from "@/components/Inventory/components/ui/button";
import { Checkbox } from "@/components/Inventory/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Inventory/components/ui/select";
import { Badge } from "@/components/Inventory/components/ui/badge";
import { Input } from "@/components/Inventory/components/ui/input";
import { Package, Building, User, ShoppingCart, Calendar, Eye, Check, ChevronsUpDown } from "lucide-react";
import { BulkAssignmentActions } from "./BulkAssignmentActions";
import { PurchaseOrderDialog } from "./PurchaseOrderDialog";
import type { InvoiceLineItem, FulfillmentSource, FieldRep, Supplier, Invoice, PurchaseOrder } from "@/components/Inventory/types/inventory";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from "@/components/Inventory/components/ui/pagination";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/Inventory/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Inventory/components/ui/popover";
import { cn } from "@/lib/utils";
import { cfg } from "@/lib/config";

// ====== 1. UPDATE THE PROPS INTERFACE ======
interface FulfillmentTableProps {
  lineItems: InvoiceLineItem[];
  invoiceId: string;
  onLineItemUpdate: (itemId: string, updates: Partial<InvoiceLineItem>) => void;
  onAction: (action: string, data: any) => void;
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[]; // Add this
  fieldReps: FieldRep[]; // It now receives the live list of field reps
}

export function FulfillmentTable({ 
  lineItems, 
  invoiceId, 
  onLineItemUpdate,
  onAction,
  suppliers,
  purchaseOrders, // Add this
  fieldReps = [] // Receive the new prop and default to an empty array
}: FulfillmentTableProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [poDialogOpen, setPODialogOpen] = useState(false);
  const [selectedItemForPO, setSelectedItemForPO] = useState<InvoiceLineItem | null>(null);
  
  // NEW: State for product autocomplete
  const [productsCache, setProductsCache] = useState<Record<string, Array<{id: string, name: string, quantity: number}>>>({});
  const [loadingProducts, setLoadingProducts] = useState<string>('');
  const [openComboboxes, setOpenComboboxes] = useState<Record<string, boolean>>({});
  const [productSearchValue, setProductSearchValue] = useState<Record<string, string>>({});

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

  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItems(prev => 
      checked ? [...prev, itemId] : prev.filter(id => id !== itemId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(checked ? lineItems.map(item => item.id) : []);
  };

  const handleBulkAssignment = (source: FulfillmentSource) => {
    selectedItems.forEach(itemId => {
      onLineItemUpdate(itemId, {
        fulfillmentSource: source,
        serialNumbers: undefined,
        assignedLocation: undefined,
        assignedRep: undefined,
        poId: undefined
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

  // MODIFIED: Update source change handler to fetch products
  const handleSourceChange = async (itemId: string, source: FulfillmentSource) => {
    // Map source to location name
    const locationMap: Record<string, string> = {
      'MAIN_HQ': 'Inventory - Main HQ',
      'NYAMIRA': 'Inventory - Nyamira Branch',
      'FIELD_REP': 'Inventory - Field Reps'
    };
    
    const locationName = locationMap[source];
    if (locationName && source !== 'FIELD_REP') {
      // For MAIN_HQ and NYAMIRA, fetch products immediately
      await fetchProductsForLocation(locationName);
    }
    
    onLineItemUpdate(itemId, {
      fulfillmentSource: source,
      serialNumbers: undefined,
      assignedLocation: source === 'MAIN_HQ' ? 'Main HQ' : source === 'NYAMIRA' ? 'Nyamira' : undefined,
      assignedRep: undefined,
      poId: undefined
    });
  };

  // NEW: Handle Field Rep selection - fetch products for that rep
  const handleRepChange = async (itemId: string, repName: string) => {
    onLineItemUpdate(itemId, { assignedRep: repName });
    
    // Fetch products for this field rep
    await fetchProductsForLocation('Inventory - Field Reps', repName);
  };

  // NEW: Handle product selection from autocomplete
  const handleProductSelect = (itemId: string, productId: string, productName: string) => {
    // Store product ID in serialNumbers[0] (which acts as productID in backend)
    onLineItemUpdate(itemId, {
      serialNumbers: [productId]
    });
    
    // Update search value to show selected product name
    setProductSearchValue(prev => ({ ...prev, [itemId]: productName }));
    
    // Close combobox
    setOpenComboboxes(prev => ({ ...prev, [itemId]: false }));
  };

  const handleCreatePO = (item: InvoiceLineItem) => {
    setSelectedItemForPO(item);
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
      const price = Number(poData.purchasePrice || 0);
      const total = (qty * price).toLocaleString();

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
              <td style="text-align:right;padding:6px;border-bottom:1px solid #f2f2f2">${price.toLocaleString()}</td>
              <td style="text-align:right;padding:6px;border-bottom:1px solid #f2f2f2">${(qty * price).toLocaleString()}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align:right;padding:6px"><strong>Total</strong></td>
              <td style="text-align:right;padding:6px"><strong>${(qty * price).toLocaleString()}</strong></td>
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
      const price = Number(poData.purchasePrice || 0);
      const total = (qty * price).toLocaleString();

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
    <tbody><tr><td>${poData.productName || '-'}</td><td class="num">${qty}</td><td class="num">${price.toLocaleString()}</td><td class="num">${total}</td></tr></tbody>
    <tfoot><tr><td colspan="3" style="text-align:right"><strong>Total</strong></td><td class="num"><strong>${total}</strong></td></tr></tfoot>
  </table>
  <div class="sign"><div><div><strong>Authorized By</strong></div><div class="box"></div><small>Signature / Date</small></div>
       <div><div><strong>Supplier Acceptance</strong></div><div class="box"></div><small>Signature / Date</small></div></div>
</div>
<script>window.addEventListener('load',()=>{document.title='Purchase Order';});</script>
</body></html>`;

      const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      window.open(blobUrl, '_blank', 'noopener');
      // Let the browser reclaim memory later; leave URL alive a bit for printing
      setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
    } catch {
      // no-op; keep UX silent here
    }
  };

  // Resolve the PO data for a given line item from current state
  const resolvePOForItem = (item: InvoiceLineItem) => {
    const existing = purchaseOrders?.find(po => po.poId === item.poId);
    return existing || {
      poId: item.poId,
      supplierName: (item as any).assignedSupplierName,
      supplierPhone: (item as any).assignedSupplierPhone,
      purchasePrice: item.unitPrice,
      relatedInvoiceId: invoiceId,
      productName: item.productName,
      quantity: item.quantity,
      createdDate: new Date().toISOString(),
      createdBy: (typeof window !== 'undefined' && sessionStorage.getItem('currentUserName')) || 'Current User'
    };
  };

  const handlePOCreated = (poData: any) => {
    if (selectedItemForPO) {
      // FIX: Update the local line item WITHOUT triggering a full refresh
      onLineItemUpdate(selectedItemForPO.id, {
        poId: poData.poId,
        fulfillmentSource: 'OUTSOURCE',
        // store supplier name locally for immediate UI; parent model may not include this field
        assignedSupplierName: poData.supplierName,
        assignedSupplierPhone: poData.supplierPhone
      } as any);
      
      // FIX: Create the PO in the background without refreshing the UI
      // This prevents losing other assignments
      onAction('createPurchaseOrder', {
        ...poData,
        relatedInvoiceId: invoiceId,
        productId: selectedItemForPO.productId,
        quantity: selectedItemForPO.quantity,        // ← THIS WAS MISSING!
        sellingPrice: selectedItemForPO.unitPrice * selectedItemForPO.quantity,
        createdDate: new Date().toISOString(),
        createdBy: (typeof window !== 'undefined' && sessionStorage.getItem('currentUserName')) || 'Current User'
      });
    }
    setPODialogOpen(false);
    setSelectedItemForPO(null);
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

  // MODIFIED: Render assignment details with product autocomplete
  const renderAssignmentDetails = (item: InvoiceLineItem) => {
    if (!item.fulfillmentSource) return null;

    switch (item.fulfillmentSource) {
      case 'MAIN_HQ':
      case 'NYAMIRA': {
        const locationName = item.fulfillmentSource === 'MAIN_HQ' 
          ? 'Inventory - Main HQ' 
          : 'Inventory - Nyamira Branch';
        const cacheKey = locationName;
        const products = productsCache[cacheKey] || [];
        const selectedProductId = item.serialNumbers?.[0] || '';
        const selectedProduct = products.find(p => p.id === selectedProductId);
        const isOpen = openComboboxes[item.id] || false;
        const searchValue = productSearchValue[item.id] || '';
        
        // Fetch products if not cached
        if (!productsCache[cacheKey] && !loadingProducts) {
          fetchProductsForLocation(locationName);
        }
        
        return (
          <Popover open={isOpen} onOpenChange={(open) => setOpenComboboxes(prev => ({ ...prev, [item.id]: open }))}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={isOpen}
                className="w-[280px] h-8 justify-between text-xs"
              >
                {selectedProduct ? (
                  <span className="truncate">{selectedProduct.name}</span>
                ) : (
                  <span className="text-muted-foreground">Search product...</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command>
                <CommandInput 
                  placeholder="Search product..." 
                  value={searchValue}
                  onValueChange={(value) => setProductSearchValue(prev => ({ ...prev, [item.id]: value }))}
                />
                <CommandList>
                  <CommandEmpty>
                    {loadingProducts === cacheKey ? 'Loading...' : 'No products found.'}
                  </CommandEmpty>
                  <CommandGroup>
                    {products
                      .filter(product => 
                        !searchValue || 
                        product.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                        product.id.toLowerCase().includes(searchValue.toLowerCase())
                      )
                      .map((product) => (
                        <CommandItem
                          key={product.id}
                          value={product.id}
                          onSelect={() => handleProductSelect(item.id, product.id, product.name)}
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
      }

      case 'FIELD_REP': {
        const cacheKey = item.assignedRep ? `Inventory - Field Reps-${item.assignedRep}` : '';
        const products = item.assignedRep ? (productsCache[cacheKey] || []) : [];
        const selectedProductId = item.serialNumbers?.[0] || '';
        const selectedProduct = products.find(p => p.id === selectedProductId);
        const isOpen = openComboboxes[item.id] || false;
        const searchValue = productSearchValue[item.id] || '';
        
        // Fetch products when rep is selected and not cached
        if (item.assignedRep && !productsCache[cacheKey] && !loadingProducts) {
          fetchProductsForLocation('Inventory - Field Reps', item.assignedRep);
        }
        
        return (
          <div className="space-y-2">
            <Select
              value={item.assignedRep || ''}
              onValueChange={(value) => handleRepChange(item.id, value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select rep..." />
              </SelectTrigger>
              <SelectContent>
                {fieldReps.map(rep => (
                  <SelectItem key={rep.id} value={rep.name}>
                    {rep.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {item.assignedRep && (
              <Popover open={isOpen} onOpenChange={(open) => setOpenComboboxes(prev => ({ ...prev, [item.id]: open }))}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isOpen}
                    className="w-[280px] h-8 justify-between text-xs"
                    disabled={!item.assignedRep}
                  >
                    {selectedProduct ? (
                      <span className="truncate">{selectedProduct.name}</span>
                    ) : (
                      <span className="text-muted-foreground">Search product...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search product..." 
                      value={searchValue}
                      onValueChange={(value) => setProductSearchValue(prev => ({ ...prev, [item.id]: value }))}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {loadingProducts === cacheKey ? 'Loading...' : 'No products found.'}
                      </CommandEmpty>
                      <CommandGroup>
                        {products
                          .filter(product => 
                            !searchValue || 
                            product.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                            product.id.toLowerCase().includes(searchValue.toLowerCase())
                          )
                          .map((product) => (
                            <CommandItem
                              key={product.id}
                              value={product.id}
                              onSelect={() => handleProductSelect(item.id, product.id, product.name)}
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
            )}
          </div>
        );
      }

      case 'OUTSOURCE':
        // Add safety check for undefined purchaseOrders
        const relatedPO = purchaseOrders?.find(po => po.poId === item.poId);
        const supplierName = (item as any).assignedSupplierName || relatedPO?.supplierName || 'Unknown Supplier';
        
        return (
          <div className="flex items-center gap-2">
            {item.poId ? (
              <>
                <Badge variant="success" className="text-xs">
                  {supplierName}
                </Badge>
                <Button
                  onClick={() => downloadPOPdf(resolvePOForItem(item))}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                >
                  Download PDF
                </Button>
              </>
            ) : (
              <Button
                onClick={() => handleCreatePO(item)}
                size="sm"
                variant="outline"
                className="h-8 text-xs"
              >
                Create PO
              </Button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="space-y-4">
        <BulkAssignmentActions
          selectedCount={selectedItems.length}
          onBulkAssign={handleBulkAssignment}
          onClearSelection={() => setSelectedItems([])}
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
                  />
                </TableHead>
                <TableHead className="font-medium text-gray-700">Product</TableHead>
                <TableHead className="font-medium text-gray-700">Qty</TableHead>
                <TableHead className="font-medium text-gray-700">Unit Price</TableHead>
                <TableHead className="font-medium text-gray-700">Total</TableHead>
                <TableHead className="font-medium text-gray-700">Source</TableHead>
                <TableHead className="font-medium text-gray-700">Assignment Details</TableHead>
                <TableHead className="font-medium text-gray-700 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map((item) => {
                const isComplete = (() => {
                  if (!item.fulfillmentSource) return false;
                  switch (item.fulfillmentSource) {
                    case 'MAIN_HQ':
                    case 'NYAMIRA':
                      return item.serialNumbers && item.serialNumbers.length > 0;
                    case 'FIELD_REP':
                      return item.assignedRep && item.serialNumbers && item.serialNumbers.length > 0;
                    case 'OUTSOURCE':
                      return !!item.poId;
                    default:
                      return false;
                  }
                })();

                return (
                  <TableRow key={item.id} className="hover:bg-gray-50/60 transition-colors">
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        <p className="text-xs text-gray-500 font-mono">{item.productId}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-gray-900">{item.quantity}</TableCell>
                    <TableCell className="font-mono text-gray-900">KSh {item.unitPrice.toLocaleString()}</TableCell>
                    <TableCell className="font-mono font-semibold text-gray-900">
                      KSh {(item.quantity * item.unitPrice).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.fulfillmentSource || ''}
                        onValueChange={(value: FulfillmentSource) => handleSourceChange(item.id, value)}
                      >
                        <SelectTrigger className="w-[200px] h-9">
                          <SelectValue>
                            {item.fulfillmentSource ? (
                              <div className="flex items-center gap-2 text-gray-900">
                                {getSourceIcon(item.fulfillmentSource)}
                                <span className="text-xs font-medium">{getSourceLabel(item.fulfillmentSource)}</span>
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
                    </TableCell>
                    <TableCell className="min-w-[220px]">
                      {renderAssignmentDetails(item)}
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
          onClose={() => setPODialogOpen(false)}
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