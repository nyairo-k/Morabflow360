import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, RefreshCw } from "lucide-react";
import { DashboardCards } from "@/components/requisitions/DashboardCards";
import { CreateRequisitionDialog } from "@/components/requisitions/CreateRequisitionDialog";
import { RequisitionCard } from "@/components/requisitions/RequisitionCard";
import { Requisition } from "@/types/requisition"; // Assuming this type is correct
import { usePagination } from "@/hooks/use-pagination";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

// Define a type for our user object
interface User {
  name: string;
  role: string;
}

interface RequisitionsPageProps {
  currentUser: User;
  requisitions: Requisition[];
  onAction: (action: string, data: any) => void;
  onRefresh: () => void;
}

// ====== THE NEW, SIMPLIFIED APPROACH ======
export default function RequisitionsPage({ 
  currentUser, 
  requisitions = [], // Safeguard #1: Default the prop to an empty array
  onAction, 
  onRefresh
}: RequisitionsPageProps) {
  
  // State for filters remains the same
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Helper function to perform the filtering. This is clearer than useMemo.
  const getFilteredRequisitions = () => {
    // Safeguard #2: Ensure we are always working with an array
    const sourceRequisitions = Array.isArray(requisitions) ? requisitions : [];

    const filtered = sourceRequisitions.filter(req => {
      if (!req) return false; // Discard any invalid entries

      // Status Filter - Updated logic to handle all status types
      if (statusFilter !== 'all') {
        let matchesFilter = false;
        
        switch (statusFilter) {
          case 'Pending Approval':
            matchesFilter = req.approvalStatus === 'Pending Approval';
            break;
          case 'Approved':
            matchesFilter = req.approvalStatus === 'Approved' && req.paymentStatus === 'Unpaid';
            break;
          case 'Paid':
            matchesFilter = req.paymentStatus === 'Paid' && req.receiptStatus !== 'Received';
            break;
          case 'Paid - Awaiting Receipt':
            matchesFilter = req.paymentStatus === 'Paid' && req.receiptStatus !== 'Received';
            break;
          case 'Received':
            matchesFilter = req.receiptStatus === 'Received';
            break;
          case 'Rejected':
            matchesFilter = req.approvalStatus === 'Rejected';
            break;
          default:
            matchesFilter = false;
        }
        
        if (!matchesFilter) {
          return false;
        }
      }

      // Search Term Filter (with defensive checks)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const inId = String(req.id || "").toLowerCase().includes(term);
        const inSupplier = String(req.supplierName || "").toLowerCase().includes(term);
        const inRequester = String(req.createdBy || "").toLowerCase().includes(term);

        if (!inId && !inSupplier && !inRequester) {
          return false; // If search term doesn't match, filter out
        }
      }

      // If it passed all checks, keep it
      return true;
    });

    // Sort: paid requisitions by paymentDate (most recent first), then unpaid by createdDate (most recent first)
    return filtered.sort((a, b) => {
      // If both are paid, sort by paymentDate (most recent first)
      if (a.paymentStatus === 'Paid' && b.paymentStatus === 'Paid') {
        const aDate = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
        const bDate = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
        return bDate - aDate; // Most recent first
      }
      // If only one is paid, paid ones come first
      if (a.paymentStatus === 'Paid' && b.paymentStatus !== 'Paid') return -1;
      if (a.paymentStatus !== 'Paid' && b.paymentStatus === 'Paid') return 1;
      // Both unpaid, sort by createdDate (most recent first)
      return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
    });
  };
  
  // Call the function to get the list to display
  const filteredRequisitions = getFilteredRequisitions();
  const { page, totalPages, setPage, slice } = usePagination({ totalItems: filteredRequisitions.length, initialPage: 1, initialPageSize: 10 });
  const paginatedRequisitions = useMemo(() => {
    const [start, end] = slice;
    return filteredRequisitions.slice(start, end);
  }, [filteredRequisitions, slice]);

  // Your other helper functions and constants remain
  const departments = [...new Set(requisitions.map(req => req.department))];
  const statuses = ['Pending Approval', 'Approved', 'Paid', 'Paid - Awaiting Receipt', 'Received', 'Rejected'];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header - onAction for refresh is now correct */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Requisitions</h1>
            <p className="text-muted-foreground">Welcome, {currentUser.name}</p>
          </div>
          <div className="flex gap-2">
            {(currentUser.role === 'InventoryStaff' || currentUser.role === 'Sales') && (
              <CreateRequisitionDialog currentUser={currentUser} onAction={onAction} />
            )}
            {/* The refresh button in index.tsx is what triggers the data reload */}
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Dashboard Cards */}
        <DashboardCards requisitions={requisitions} currentUser={currentUser} />

        {/* Filters */}
        <div className="flex gap-4">
            <Input
              placeholder="Search by ID, Requester, or Supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statuses.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
            Showing {paginatedRequisitions.length} of {filteredRequisitions.length} filtered, from {requisitions.length} total
        </div>

        {/* Requisitions List */}
        {filteredRequisitions.length > 0 ? (
          <div className="space-y-4">
            {paginatedRequisitions.map((requisition) => (
              <RequisitionCard
                key={requisition.id}
                requisition={requisition}
                currentUser={currentUser}
                onAction={onAction}
              />
            ))}
            <div className="pt-4">
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
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No requisitions found.</p>
            {searchTerm || statusFilter !== 'all' ? <p className="text-sm">Try adjusting your filters.</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}