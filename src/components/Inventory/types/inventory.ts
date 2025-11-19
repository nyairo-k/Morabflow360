// Data model types based on Google Sheets structure
export interface Product {
  productId: string;
  productName: string;
  description: string;
  category: string;
}

export interface InventoryTransaction {
  transactionId: string;
  productId: string;
  serialNumber?: string;
  transactionType: 'IN' | 'OUT';
  quantityChange: number;
  location: string; // "Main HQ", "Nyamira", "Rep-JohnDoe"
  transactionDate: string;
  relatedInvoiceId?: string;
}

export interface Supplier {
  supplierId: string;
  supplierName: string;
  phoneNumber: string;
  contactPerson: string;
}

export interface PurchaseOrder {
  poId: string;
  relatedInvoiceId: string;
  productName: string;  // ← CHANGE: Use productName instead of productId
  quantity: string | number;
  supplierName: string;
  supplierPhone: string | number;
  purchasePrice: number;
  sellingPrice: number;
  profit: number;  // ← ADD: Include profit field
  supplierInvoiceURL?: string;
  paymentStatusToSupplier: 'Unpaid' | 'UNPAID' | 'PARTIAL' | 'PAID';
  paymentDetailsToSupplier?: PaymentDetails[];
}

export interface PaymentDetails {
  amountPaid: number;
  mpesaCode: string;
  proofOfPayment?: string;
  paymentDate: string;
}

export interface FulfillmentSplit {
  id: string;
  parentItemId: string;
  quantity: number;
  fulfillmentSource?: FulfillmentSource;
  serialNumbers?: string[];
  poId?: string;
  assignedLocation?: string;
  assignedRep?: string;
  assignedSupplierName?: string;
  assignedSupplierPhone?: string;
}

export interface InvoiceLineItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  fulfillmentSource?: FulfillmentSource;
  serialNumbers?: string[];
  poId?: string;
  assignedLocation?: string;
  assignedRep?: string;
  assignedSupplierName?: string;
  assignedSupplierPhone?: string;
  fulfillmentSplits?: FulfillmentSplit[];
  skipFulfillment?: boolean;
  nonFulfillmentReason?: string;
  nonFulfillmentNotes?: string;
}

export interface Invoice {
  invoiceId: string;
  customerName: string;
  customerPhone: string;
  invoiceDate: string;
  status: 'AWAITING_FULFILLMENT' | 'ASSIGNED' | 'DISPATCHED' | 'COMPLETED';
  lineItems: InvoiceLineItem[];
  totalAmount: number;
}

export type FulfillmentSource = 'MAIN_HQ' | 'NYAMIRA' | 'FIELD_REP' | 'OUTSOURCE';

export interface FieldRep {
  id: string;
  name: string;
  phone: string;
  location: string;
}

export interface DispatchOrder {
  dispatchItemId: string;
  invoiceId: string;
  productId: string;
  quantityToDispatch: number;
  sourceDetails: string;
  assignedBy: string;
  assignmentDate: string;
  dispatchApprovalStatus: 'Awaiting Fulfillment' | 'Pending Approval' | 'Approved' | 'Rejected';
  approvedBy: string;
  approvalDate: string;
  salesRep: string;
  postedDate: string;
}

export interface Requisition {
  id: string;
  department: string;
  supplierName: string;
  requestedBy: string;
  requestDate: string;
  createdDate: string;
  totalAmount: number;
  status: 'Pending Approval' | 'Approved' | 'Paid' | 'Awaiting Receipt' | 'Completed';
  paymentStatus: 'Unpaid' | 'Paid' | 'Partial';
  items: RequisitionItem[];
  notes?: string;
  stockVerified?: boolean;
  receiptUploaded?: boolean;
  receiptUrl?: string;
  approvedBy?: string;
  approvedDate?: string;
  paidBy?: string;
  paidDate?: string;
}

export interface RequisitionItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  description?: string;
}
