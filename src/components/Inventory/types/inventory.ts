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
  productId: string;
  quantity: string | number;  // ← Allow both string and number
  supplierName: string;
  supplierPhone: string | number;  // ← Allow both string and number
  purchasePrice: number;
  sellingPrice: number;
  supplierInvoiceURL?: string;
  paymentStatusToSupplier: 'Unpaid' | 'UNPAID' | 'PARTIAL' | 'PAID';  // ← Allow both cases
  paymentDetailsToSupplier?: PaymentDetails[];
}

export interface PaymentDetails {
  amountPaid: number;
  mpesaCode: string;
  proofOfPayment?: string;
  paymentDate: string;
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