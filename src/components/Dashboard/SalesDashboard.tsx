import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Receipt, TrendingUp, DollarSign } from "lucide-react";

interface SalesDashboardProps {
  quotations: any[];
  invoices: any[];
}

export function SalesDashboard({ quotations, invoices }: SalesDashboardProps) {
  const totalQuotations = quotations.length;
  const pendingQuotations = quotations.filter(q => q.status === "Pending").length;
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(i => i.paymentStatus === "Paid").length;

  const totalQuotationValue = quotations.reduce((sum, q) => sum + parseFloat(q.totalAmount || 0), 0);
  const totalInvoiceValue = invoices.reduce((sum, i) => sum + parseFloat(i.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Sales Dashboard</h2>
        <p className="text-muted-foreground">Monitor your quotations and invoice requests</p>
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
            <div className="text-2xl font-bold">${totalQuotationValue.toLocaleString()}</div>
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
            <div className="text-2xl font-bold">${totalInvoiceValue.toLocaleString()}</div>
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
            {quotations.slice(0, 5).map((quote) => (
              <div key={quote.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                <div>
                  <p className="font-medium">{quote.clientName}</p>
                  <p className="text-sm text-muted-foreground">{quote.productName}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${parseFloat(quote.totalAmount).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{quote.status}</p>
                </div>
              </div>
            ))}
            {quotations.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No quotations yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Invoice Requests</CardTitle>
            <CardDescription>Your latest invoice requests</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.slice(0, 5).map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                <div>
                  <p className="font-medium">{invoice.clientName}</p>
                  <p className="text-sm text-muted-foreground">{invoice.productService}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${parseFloat(invoice.totalAmount).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{invoice.paymentStatus}</p>
                </div>
              </div>
            ))}
            {invoices.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No invoice requests yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}