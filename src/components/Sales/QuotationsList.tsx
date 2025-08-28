import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown, ChevronRight, Download, FileText } from "lucide-react";

interface QuotationsListProps {
  quotations: any[];
  onApprove: (id: string) => void;
}

export function QuotationsList({ quotations, onApprove }: QuotationsListProps) {
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);

  const handleToggleExpand = (quoteId: string) => {
    setExpandedQuoteId(prevId => (prevId === quoteId ? null : quoteId));
  };

  return (
    <Card>
      <CardHeader>
         <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>My Quotations</span>
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
            {quotations.map((quote) => (
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
                          {quote.items.map((item: any, index: number) => (
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
      </CardContent>
    </Card>
  );
}