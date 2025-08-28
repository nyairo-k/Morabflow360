import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/Inventory/components/ui/table";
import { Button } from "@/components/Inventory/components/ui/button";
import { Checkbox } from "@/components/Inventory/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Inventory/components/ui/select";
import { Badge } from "@/components/Inventory/components/ui/badge";
import { Input } from "@/components/Inventory/components/ui/input";
import { Package, Building, User, ShoppingCart } from "lucide-react";
import { BulkAssignmentActions } from "./BulkAssignmentActions";
import { PurchaseOrderDialog } from "./PurchaseOrderDialog";
import type { InvoiceLineItem, FulfillmentSource, FieldRep, Supplier } from "@/components/Inventory/types";

// ====== 1. UPDATE THE PROPS INTERFACE ======
interface FulfillmentTableProps {
  lineItems: InvoiceLineItem[];
  invoiceId: string;
  onLineItemUpdate: (itemId: string, updates: Partial<InvoiceLineItem>) => void;
  onAction: (action: string, data: any) => void;
  suppliers: Supplier[];
  fieldReps: FieldRep[]; // It now receives the live list of field reps
}


export function FulfillmentTable({ 
  lineItems, 
  invoiceId, 
  onLineItemUpdate,
  onAction,
  suppliers,
  fieldReps = [] // Receive the new prop and default to an empty array
}: FulfillmentTableProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [poDialogOpen, setPODialogOpen] = useState(false);
  const [selectedItemForPO, setSelectedItemForPO] = useState<InvoiceLineItem | null>(null);

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

  const handleSourceChange = (itemId: string, source: FulfillmentSource) => {
    onLineItemUpdate(itemId, {
      fulfillmentSource: source,
      serialNumbers: undefined,
      assignedLocation: source === 'MAIN_HQ' ? 'Main HQ' : source === 'NYAMIRA' ? 'Nyamira' : undefined,
      assignedRep: undefined,
      poId: undefined
    });
  };

  const handleCreatePO = (item: InvoiceLineItem) => {
    setSelectedItemForPO(item);
    setPODialogOpen(true);
  };

  const handlePOCreated = (poData: any) => {
    if (selectedItemForPO) {
      // Pass the create PO action and data up to the parent
      onAction('createPurchaseOrder', {
        ...poData,
        relatedInvoiceId: invoiceId,
        productId: selectedItemForPO.productId,
        sellingPrice: selectedItemForPO.unitPrice * selectedItemForPO.quantity
      });
      // The parent (index.tsx) will handle the refresh, which will update the PO ID on the item
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

  const renderAssignmentDetails = (item: InvoiceLineItem) => {
    if (!item.fulfillmentSource) return null;

    switch (item.fulfillmentSource) {
      case 'MAIN_HQ':
      case 'NYAMIRA':
        return (
          <div className="flex items-center gap-2 text-xs">
            <Input
              placeholder="Enter serial number"
              value={item.serialNumbers?.[0] || ''}
              onChange={(e) => onLineItemUpdate(item.id, {
                serialNumbers: e.target.value.trim() ? [e.target.value.trim()] : undefined
              })}
              className="h-8 text-xs"
            />
          </div>
        );

      case 'FIELD_REP':
        return (
          <div className="space-y-2">
            <Select
              value={item.assignedRep || ''}
              onValueChange={(value) => onLineItemUpdate(item.id, { assignedRep: value })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select rep..." />
              </SelectTrigger>
              <SelectContent>
                {/* This now correctly maps over the live 'fieldReps' prop */}
                {fieldReps.map(rep => (
                  <SelectItem key={rep.id} value={rep.name}>
                    {rep.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {item.assignedRep && (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Enter serial number"
                  // This value was missing from your provided code, causing a bug.
                  value={item.serialNumbers?.[0] || ''}
                  onChange={(e) => onLineItemUpdate(item.id, {
                    serialNumbers: e.target.value.trim() ? [e.target.value.trim()] : undefined
                  })}
                  className="h-8 text-xs"
                />
              </div>
            )}
          </div>
        );


      case 'OUTSOURCE':
        return (
          <div className="flex items-center gap-2">
            {item.poId ? (
              <Badge variant="success" className="text-xs">PO: {item.poId}</Badge>
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

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedItems.length > 0 && selectedItems.length === lineItems.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Assignment Details</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => {
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
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">{item.productId}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{item.quantity}</TableCell>
                    <TableCell className="font-mono">KSh {item.unitPrice.toLocaleString()}</TableCell>
                    <TableCell className="font-mono font-medium">
                      KSh {(item.quantity * item.unitPrice).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.fulfillmentSource || ''}
                        onValueChange={(value: FulfillmentSource) => handleSourceChange(item.id, value)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue>
                            {item.fulfillmentSource ? (
                              <div className="flex items-center gap-2">
                                {getSourceIcon(item.fulfillmentSource)}
                                <span className="text-xs">{getSourceLabel(item.fulfillmentSource)}</span>
                              </div>
                            ) : (
                              "Select source..."
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MAIN_HQ">
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              Main HQ Store
                            </div>
                          </SelectItem>
                          <SelectItem value="NYAMIRA">
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              Nyamira Store
                            </div>
                          </SelectItem>
                          <SelectItem value="FIELD_REP">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Field Rep Stock
                            </div>
                          </SelectItem>
                          <SelectItem value="OUTSOURCE">
                            <div className="flex items-center gap-2">
                              <ShoppingCart className="h-4 w-4" />
                              Outsource from Supplier
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="min-w-[200px]">
                      {renderAssignmentDetails(item)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isComplete ? "success" : "secondary"}>
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