import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Receipt, Upload, DollarSign, Clock, Calendar as CalendarIcon, AlertTriangle, Check } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";

interface FinanceDashboardProps {
  invoices: any[];
  payments: any[];
}

export function FinanceDashboard({ invoices, payments }: FinanceDashboardProps) {
  // AUTO-DETECT CURRENT WEEK (Monday to Sunday)
  const getCurrentWeek = () => {
    const now = new Date();
    const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
    return { startOfCurrentWeek, endOfCurrentWeek };
  };

  const { startOfCurrentWeek, endOfCurrentWeek } = getCurrentWeek();
  
  // STATE FOR DATE FILTERING
  const [startDate, setStartDate] = useState<Date | undefined>(startOfCurrentWeek);
  const [endDate, setEndDate] = useState<Date | undefined>(endOfCurrentWeek);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCustomFilter, setIsCustomFilter] = useState(false);

  // FILTER DATA BY DATE RANGE
  const filteredInvoices = invoices.filter(invoice => {
    if (!startDate && !endDate) return true;
    
    const invoiceDate = new Date(invoice.submittedDate);
    
    if (startDate && endDate) {
      return invoiceDate >= startDate && invoiceDate <= endDate;
    } else if (startDate) {
      return invoiceDate >= startDate;
    } else if (endDate) {
      return invoiceDate <= endDate;
    }
    return true;
  });

  const filteredPayments = payments.filter(payment => {
    if (!startDate && !endDate) return true;
    
    const paymentDate = new Date(payment.paymentDate);
    
    if (startDate && endDate) {
      return paymentDate >= startDate && paymentDate <= endDate;
    } else if (startDate) {
      return paymentDate >= startDate;
    } else if (endDate) {
      return paymentDate <= endDate;
    }
    return true;
  });

  // CALCULATE METRICS FROM FILTERED INVOICE DATA
  // Total Revenue = Sum of all invoice totalAmount values in the filtered period
  const totalRevenue = filteredInvoices.reduce((sum, invoice) => {
    return sum + parseFloat(invoice.totalAmount || 0);
  }, 0);

  // Collected Revenue = Sum of payments made within the selected period (filtered by payment date)
  const collectedRevenue = filteredPayments.reduce((sum, payment) => {
    return sum + parseFloat(payment.amountPaid || 0);
  }, 0);

  // CALCULATE OUTSTANDING AMOUNT:
  // 1. Sum of totalAmount for unpaid invoices
  // 2. Plus sum of balance from payments sheet for selected period (for partially paid invoices)
  const outstandingAmount = (() => {
    let unpaidInvoicesTotal = 0;
    let partiallyPaidBalancesTotal = 0;

    filteredInvoices.forEach(invoice => {
      // Find all payments for this invoice
      const relatedPayments = payments.filter(p => p.invoiceId === invoice.id);
      
      if (relatedPayments.length === 0) {
        // Unpaid invoice: add its totalAmount
        unpaidInvoicesTotal += parseFloat(invoice.totalAmount || 0);
      } else {
        // Partially paid invoice: get balance from latest payment in selected period
        const paymentsInPeriod = relatedPayments.filter(payment => {
          if (!startDate && !endDate) return true;
          const paymentDate = new Date(payment.paymentDate);
          if (startDate && endDate) {
            return paymentDate >= startDate && paymentDate <= endDate;
          } else if (startDate) {
            return paymentDate >= startDate;
          } else if (endDate) {
            return paymentDate <= endDate;
          }
          return true;
        });

        if (paymentsInPeriod.length > 0) {
          // Get the latest payment's balance (most recent payment)
          const latestPayment = paymentsInPeriod.sort((a, b) => 
            new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
          )[0];
          partiallyPaidBalancesTotal += parseFloat(latestPayment.balance || 0);
        } else {
          // If no payments in period, calculate outstanding manually
          const totalPaid = relatedPayments.reduce((sum, p) => sum + parseFloat(p.amountPaid || 0), 0);
          const invoiceOutstanding = parseFloat(invoice.totalAmount || 0) - totalPaid;
          if (invoiceOutstanding > 0) {
            partiallyPaidBalancesTotal += invoiceOutstanding;
          }
        }
      }
    });

    return unpaidInvoicesTotal + partiallyPaidBalancesTotal;
  })();

  // COUNT PAYMENT STATUSES FROM FILTERED INVOICE DATA (not payments)
  // Calculate payment status for each invoice and count them
  const invoicesWithPaymentStatus = filteredInvoices.map(invoice => {
    const relatedPayments = payments.filter(p => p.invoiceId === invoice.id);
    const totalPaid = relatedPayments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
    const totalAmount = Number(invoice.totalAmount);
    let paymentStatus = 'Unpaid';
    if (totalPaid > 0 && totalAmount > 0) {
      paymentStatus = totalPaid >= totalAmount ? 'Paid' : 'Partially Paid';
    }
    return { ...invoice, paymentStatus };
  });

  const paidCount = invoicesWithPaymentStatus.filter(i => i.paymentStatus === "Paid").length;
  const partiallyPaidCount = invoicesWithPaymentStatus.filter(i => i.paymentStatus === "Partially Paid").length;
  const unpaidCount = invoicesWithPaymentStatus.filter(i => i.paymentStatus === "Unpaid").length;

  // EXISTING INVOICE METRICS (FILTERED)
  const totalInvoices = filteredInvoices.length;
  const pendingInvoices = filteredInvoices.filter(i => i.status === "Waiting").length;
  const uploadedInvoices = filteredInvoices.filter(i => i.status === "Uploaded").length;

  // FUNCTIONS FOR DATE FILTERING
  const resetToCurrentWeek = () => {
    const { startOfCurrentWeek, endOfCurrentWeek } = getCurrentWeek();
    setStartDate(startOfCurrentWeek);
    setEndDate(endOfCurrentWeek);
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
          <h2 className="text-2xl font-bold text-foreground mb-2">Finance Dashboard</h2>
          <p className="text-muted-foreground">Manage invoice processing and payment tracking</p>
        </div>
        
        {/* DATE FILTER CONTROLS */}
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

      {/* DATE FILTER DISPLAY */}
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
          Week of {startDate && format(startDate, "MMM dd")} to {endDate && format(endDate, "MMM dd, yyyy")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting PDF upload
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uploaded Invoices</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uploadedInvoices}</div>
            <p className="text-xs text-muted-foreground">
              Ready for payment tracking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ksh {totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Amount Paid + Outstanding
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected Revenue</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ksh {collectedRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total amount received
            </p>
          </CardContent>
        </Card>
      </div>

      {/* OUTSTANDING AMOUNT CARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Amount</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">Ksh {outstandingAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Money owed to us
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoice Requests</CardTitle>
            <CardDescription>Latest requests from sales team</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredInvoices
              .filter(invoice => invoice.status === "Waiting")
              .slice(0, 5)
              .map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                  <div>
                    <p className="font-medium">{invoice.clientName}</p>
                    <p className="text-sm text-muted-foreground">{invoice.submittedBy}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">Ksh {parseFloat(invoice.totalAmount).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{invoice.status}</p>
                  </div>
                </div>
              ))}
            {filteredInvoices.filter(invoice => invoice.status === "Waiting").length === 0 && (
              <p className="text-center text-muted-foreground py-4">No pending invoice requests in selected period</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Status Overview</CardTitle>
            <CardDescription>Track payment collection progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Paid</span>
                <span className="text-sm text-muted-foreground">
                  {paidCount} invoices
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Partially Paid</span>
                <span className="text-sm text-muted-foreground">
                  {partiallyPaidCount} invoices
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Unpaid</span>
                <span className="text-sm text-muted-foreground">
                  {unpaidCount} invoices
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}