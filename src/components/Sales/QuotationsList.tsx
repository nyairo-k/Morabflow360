import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown, ChevronRight, Download, FileText, RefreshCw } from "lucide-react";
import { usePagination } from "@/hooks/use-pagination";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

interface QuotationsListProps {
  quotations: any[];
  onApprove: (id: string) => void;
  onRefresh?: () => void;
}

export function QuotationsList({ quotations, onApprove, onRefresh }: QuotationsListProps) {
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);

  const handleToggleExpand = (quoteId: string) => {
    setExpandedQuoteId(prevId => (prevId === quoteId ? null : quoteId));
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

  const { page, totalPages, setPage, slice } = usePagination({ totalItems: quotations?.length || 0, initialPage: 1, initialPageSize: 10 });
  const paginatedQuotations = useMemo(() => {
    const [start, end] = slice;
    return (quotations || []).slice(start, end);
  }, [quotations, slice]);

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
                  <TableCell>{quote.clientName}</TableCell>
                  <TableCell>ksh{quote.totalAmount}</TableCell>
                  <TableCell><Badge variant="outline">{quote.status}</Badge></TableCell>
                  <TableCell>{new Date(quote.submittedDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    {/* THIS IS THE ACTION BUTTONS LOGIC */}
                    <div className="flex space-x-2 justify-end items-center">
                      {quote.status === "Pending" && (
                        <Button size="sm" onClick={() => onApprove(quote.id)} className="bg-green-600 hover:bg-green-700">
                           <Check className="h-4 w-4 mr-1"/> Approve
                        </Button>
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
    </Card>
  );
}