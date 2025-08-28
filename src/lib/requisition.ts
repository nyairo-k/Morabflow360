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
  supplierName: string;
  requestedBy: string;
  requestDate: string;
  totalAmount: number;
  status: 'Pending Approval' | 'Approved' | 'Paid' | 'Awaiting Receipt' | 'Completed';
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

export interface User {
  name: string;
  role: 'InventoryStaff' | 'Admin' | 'Disbursements';
}

export interface RequisitionsPageProps {
  currentUser: User;
  requisitions: Requisition[];
  onUpdate: (requisitions: Requisition[]) => void;
  onRequisitionAdded: (requisition: Requisition) => void;
}