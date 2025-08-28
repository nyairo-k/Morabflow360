import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Upload, DollarSign, Clock } from "lucide-react";

interface FinanceDashboardProps {
  invoices: any[];
}

export function FinanceDashboard({ invoices }: FinanceDashboardProps) {
  const totalInvoices = invoices.length;
  const pendingInvoices = invoices.filter(i => i.status === "Waiting").length;
  const uploadedInvoices = invoices.filter(i => i.status === "Uploaded").length;
  const paidInvoices = invoices.filter(i => i.paymentStatus === "Paid").length;

  const totalValue = invoices.reduce((sum, i) => sum + parseFloat(i.totalAmount || 0), 0);
  const paidValue = invoices
    .filter(i => i.paymentStatus === "Paid")
    .reduce((sum, i) => sum + parseFloat(i.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Finance Dashboard</h2>
        <p className="text-muted-foreground">Manage invoice processing and payment tracking</p>
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
            <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All invoice requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected Revenue</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${paidValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {paidInvoices} paid invoices
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
            {invoices.slice(0, 5).map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                <div>
                  <p className="font-medium">{invoice.clientName}</p>
                  <p className="text-sm text-muted-foreground">{invoice.submittedBy}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${parseFloat(invoice.totalAmount).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{invoice.status}</p>
                </div>
              </div>
            ))}
            {invoices.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No invoice requests yet</p>
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
                  {invoices.filter(i => i.paymentStatus === "Paid").length} invoices
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Partially Paid</span>
                <span className="text-sm text-muted-foreground">
                  {invoices.filter(i => i.paymentStatus === "Partially Paid").length} invoices
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Unpaid</span>
                <span className="text-sm text-muted-foreground">
                  {invoices.filter(i => i.paymentStatus === "Unpaid").length} invoices
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}