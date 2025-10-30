export interface RequisitionItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  description?: string;
}

export interface Requisition {
  id: string;
  department: string;
  supplierName?: string;
  totalAmount: number;
  items: RequisitionItem[] | string;
  notes?: string;
  // Expanded status model used by UI
  approvalStatus: 'Pending Approval' | 'Approved' | 'Rejected';
  paymentStatus: 'Unpaid' | 'Paid';
  receiptStatus?: 'Pending' | 'Received';
  // Metadata used in UI and filters
  createdBy: string;
  createdDate: string;
  expenseCategory?: string;
  // Audit fields
  approvedBy?: string;
  approvalDate?: string;
  paidBy?: string;
  paymentDate?: string;
  receivedBy?: string;
  receivedDate?: string;
  receiptUrl?: string;
  // Optional raw payment details blob
  paymentDetails?: any;
}

export interface User {
  name: string;
  role: 'InventoryStaff' | 'Admin' | 'Disbursements' | 'Sales' | 'Finance';
}

export interface RequisitionsPageProps {
  currentUser: User;
  requisitions: Requisition[];
  onUpdate: (requisitions: Requisition[]) => void;
  onRequisitionAdded: (requisition: Requisition) => void;
}