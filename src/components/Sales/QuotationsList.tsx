import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, ChevronRight, Download, FileText, RefreshCw, Search, Phone, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { usePagination } from "@/hooks/use-pagination";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

interface QuotationsListProps {
  quotations: any[];
  onApprove: (id: string) => void;
  onReject: (id: string, rejectionReason: string) => void;
  onRefresh?: () => void;
}

export function QuotationsList({ quotations, onApprove, onReject, onRefresh }: QuotationsListProps) {
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleToggleExpand = (quoteId: string) => {
    setExpandedQuoteId(prevId => (prevId === quoteId ? null : quoteId));
  };

  const handleRejectClick = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!selectedQuoteId || !rejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    onReject(selectedQuoteId, rejectionReason.trim());
    setRejectDialogOpen(false);
    setSelectedQuoteId(null);
    setRejectionReason("");
  };

  const getItemsArray = (quote: any): any[] => {
    const raw = quote?.items;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string' && raw.trim().length > 0) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Filter quotations based on search term
  const filteredQuotations = useMemo(() => {
    if (!searchTerm.trim()) return quotations || [];
    
    const term = searchTerm.toLowerCase();
    return (quotations || []).filter(quote => {
      // Search in ID
      const matchesId = (quote.id || '').toLowerCase().includes(term);
      // Search in client name
      const matchesClient = (quote.clientName || '').toLowerCase().includes(term);
      // Search in product names from items
      const items = getItemsArray(quote);
      const matchesProducts = items.some((item: any) => 
        (item.productName || '').toLowerCase().includes(term)
      );
      
      return matchesId || matchesClient || matchesProducts;
    });
  }, [quotations, searchTerm]);

  const { page, totalPages, setPage, slice } = usePagination({ 
    totalItems: filteredQuotations.length, 
    initialPage: 1, 
    initialPageSize: 10 
  });
  
  const paginatedQuotations = useMemo(() => {
    const [start, end] = slice;
    return filteredQuotations.slice(start, end);
  }, [filteredQuotations, slice]);

  return (
    <Card>
      <CardHeader>
         <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>My Quotations</span>
            </div>
            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </Button>
            )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Search Input */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Quote ID, Client, or Product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          {searchTerm && (
            <p className="text-sm text-muted-foreground mt-2">
              Found {filteredQuotations.length} result{filteredQuotations.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead> {/* Expand button */}
              <TableHead>Quote ID</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedQuotations.map((quote) => (
              <>
                <TableRow key={quote.id}>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleExpand(quote.id)}>
                      {expandedQuoteId === quote.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{quote.id}</TableCell>
                  <TableCell>
                    {quote.clientName}
                    {quote.customerPhone && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {quote.customerPhone}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>ksh{quote.totalAmount}</TableCell>
                  <TableCell><Badge variant="outline">{quote.status}</Badge></TableCell>
                  <TableCell>{new Date(quote.submittedDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    {/* THIS IS THE ACTION BUTTONS LOGIC */}
                    <div className="flex space-x-2 justify-end items-center">
                      {quote.status === "Pending" && (
                        <>
                          <Button size="sm" onClick={() => onApprove(quote.id)} className="bg-green-600 hover:bg-green-700">
                            <Check className="h-4 w-4 mr-1"/> Approve
                          </Button>
                          <Button size="sm" onClick={() => handleRejectClick(quote.id)} variant="destructive">
                            <X className="h-4 w-4 mr-1"/> Reject
                          </Button>
                        </>
                      )}
                      {/* THE DOWNLOAD BUTTON WILL ONLY APPEAR IF quote.pdfUrl EXISTS */}
                      {quote.pdfUrl && (
                        <Button asChild variant="outline" size="icon">
                          <a href={quote.pdfUrl} target="_blank" rel="noopener noreferrer" title="Download PDF">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                 {/* The expandable details section */}
                {expandedQuoteId === quote.id && (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <div className="p-4 bg-muted">
                        {quote.status === "Rejected" && quote.rejectionReason && (
                          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <h4 className="font-semibold text-red-800 mb-1">Rejection Reason:</h4>
                            <p className="text-sm text-red-700">{quote.rejectionReason}</p>
                            {quote.rejectedBy && (
                              <p className="text-xs text-red-600 mt-1">Rejected by: {quote.rejectedBy}</p>
                            )}
                            {quote.rejectedDate && (
                              <p className="text-xs text-red-600">Date: {new Date(quote.rejectedDate).toLocaleString()}</p>
                            )}
                          </div>
                        )}
                        <h4 className="font-semibold mb-2">Quoted Items:</h4>
                        <div className="space-y-1 pl-4">
                          {getItemsArray(quote).map((item: any, index: number) => (
                            <div key={index} className="grid grid-cols-3 gap-4 text-sm">
                              <span>- {item.productName}</span>
                              <span>Qty: {item.quantity}</span>
                              <span>Price: ksh{item.unitPrice}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
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
      </CardContent>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Quotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="mt-2"
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectConfirm}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}