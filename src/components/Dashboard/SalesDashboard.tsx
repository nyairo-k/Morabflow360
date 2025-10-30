import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Receipt, TrendingUp, DollarSign, Calendar as CalendarIcon, Check } from "lucide-react";
import { startOfWeek, endOfWeek, format } from "date-fns";

interface SalesDashboardProps {
  quotations: any[];
  invoices: any[];
}

export function SalesDashboard({ quotations, invoices }: SalesDashboardProps) {
  const getCurrentWeek = () => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return { start, end };
  };

  const { start, end } = getCurrentWeek();

  const [startDate, setStartDate] = useState<Date | undefined>(start);
  const [endDate, setEndDate] = useState<Date | undefined>(end);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCustomFilter, setIsCustomFilter] = useState(false);

  const filteredQuotations = quotations.filter(q => {
    if (!startDate && !endDate) return true;
    const d = new Date(q.submittedDate);
    if (startDate && endDate) return d >= startDate && d <= endDate;
    if (startDate) return d >= startDate;
    if (endDate) return d <= endDate;
    return true;
  });

  const filteredInvoices = invoices.filter(i => {
    if (!startDate && !endDate) return true;
    const d = new Date(i.submittedDate);
    if (startDate && endDate) return d >= startDate && d <= endDate;
    if (startDate) return d >= startDate;
    if (endDate) return d <= endDate;
    return true;
  });

  const totalQuotations = filteredQuotations.length;
  const pendingQuotations = filteredQuotations.filter(q => q.status === "Pending").length;
  const totalInvoices = filteredInvoices.length;
  const paidInvoices = filteredInvoices.filter(i => i.paymentStatus === "Paid").length;

  const totalQuotationValue = filteredQuotations.reduce((sum, q) => sum + parseFloat(q.totalAmount || 0), 0);
  const totalInvoiceValue = filteredInvoices.reduce((sum, i) => sum + parseFloat(i.totalAmount || 0), 0);

  const resetToCurrentWeek = () => {
    const { start, end } = getCurrentWeek();
    setStartDate(start);
    setEndDate(end);
    setIsCustomFilter(false);
  };

  const applyCustomFilter = () => {
    setIsCustomFilter(true);
    setIsFilterOpen(false);
  };

  const clearDateFilter = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setIsCustomFilter(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Sales Dashboard</h2>
          <p className="text-muted-foreground">Monitor your quotations and invoice requests</p>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={resetToCurrentWeek}>
            This Week
          </Button>
          <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <CalendarIcon className="h-4 w-4" />
                <span>Custom Range</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px] max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Select date range</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    className="rounded-md border"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    className="rounded-md border"
                  />
                </div>
              </div>

              <div className="flex justify-between gap-2 pt-2">
                <Button variant="ghost" onClick={clearDateFilter} size="sm">Clear</Button>
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setIsFilterOpen(false)} size="sm">Cancel</Button>
                  <Button onClick={applyCustomFilter} size="sm">Apply</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="default" size="sm" onClick={applyCustomFilter} className="flex items-center space-x-1">
            <Check className="h-4 w-4" />
            <span>Apply</span>
          </Button>
        </div>
      </div>

      <div className="bg-muted p-3 rounded-md">
        <p className="text-sm">
          <span className="font-medium">Showing:</span>{" "}
          {!isCustomFilter ? (
            <span className="text-blue-600">This Week (Monday - Sunday)</span>
          ) : (
            <>
              {startDate && format(startDate, "MMM dd, yyyy")}
              {startDate && endDate && " - "}
              {endDate && format(endDate, "MMM dd, yyyy")}
            </>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {startDate && format(startDate, "MMM dd")} {startDate && endDate && "to"} {endDate && format(endDate, "MMM dd, yyyy")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotations</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuotations}</div>
            <p className="text-xs text-muted-foreground">
              {pendingQuotations} pending approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoice Requests</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
            <p className="text-xs text-muted-foreground">
              {paidInvoices} paid invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quotation Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ksh{totalQuotationValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total quoted amount
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoice Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ksh{totalInvoiceValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total invoice amount
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Quotations</CardTitle>
            <CardDescription>Your latest quotation activity</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredQuotations.slice(0, 5).map((quote) => (
              <div key={quote.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                <div>
                  <p className="font-medium">{quote.clientName}</p>
                  <p className="text-sm text-muted-foreground">{quote.productName}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">Ksh{parseFloat(quote.totalAmount).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{quote.status}</p>
                </div>
              </div>
            ))}
            {filteredQuotations.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No quotations in selected period</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Invoice Requests</CardTitle>
            <CardDescription>Your latest invoice requests</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredInvoices.slice(0, 5).map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                <div>
                  <p className="font-medium">{invoice.clientName}</p>
                  <p className="text-sm text-muted-foreground">{invoice.productService}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">Ksh{parseFloat(invoice.totalAmount).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{invoice.paymentStatus}</p>
                </div>
              </div>
            ))}
            {filteredInvoices.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No invoice requests in selected period</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}