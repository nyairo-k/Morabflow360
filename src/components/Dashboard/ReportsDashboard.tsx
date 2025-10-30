import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  Package, 
  Users, 
  Calendar as CalendarIcon, 
  RefreshCw,
  PieChart,
  LineChart,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { format, startOfWeek, endOfWeek, subDays, subMonths } from "date-fns";

interface ReportsDashboardProps {
  reportsData?: any[];
  onRefresh?: () => void;
}

interface DailyReport {
  report_date: string;
  revenue_total: number;
  revenue_collected: number;
  revenue_outstanding: number;
  revenue_outsourced: number;
  revenue_instock: number;
  expenses_total: number;
  expenses_cogs: number;
  expenses_overhead: number;
  expenses_opex: number;
  expenses_other: number;
  gross_profit: number;
  net_profit: number;
  profit_margin_percent: number;
  invoices_total_count: number;
  invoices_pending_count: number;
  invoices_uploaded_count: number;
  invoices_paid_count: number;
  requisitions_total_count: number;
  requisitions_pending_count: number;
  requisitions_approved_count: number;
  requisitions_paid_count: number;
  dispatch_orders_total: number;
  dispatch_outsourced_count: number;
  dispatch_instock_count: number;
  dispatch_field_rep_count: number;
  active_customers_count: number;
  new_customers_count: number;
  cash_inflow: number;
  cash_outflow: number;
  net_cash_flow: number;
  avg_invoice_processing_days: number;
  avg_requisition_processing_days: number;
  inventory_turnover_ratio: number;
}

export function ReportsDashboard({ reportsData = [], onRefresh }: ReportsDashboardProps) {
  // Date filtering state
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Filter data by date range
  const filteredData = reportsData.filter((report: DailyReport) => {
    if (!startDate && !endDate) return true;
    
    const reportDate = new Date(report.report_date);
    
    if (startDate && endDate) {
      return reportDate >= startDate && reportDate <= endDate;
    } else if (startDate) {
      return reportDate >= startDate;
    } else if (endDate) {
      return reportDate <= endDate;
    }
    return true;
  });

  // Calculate aggregated metrics
  const aggregatedMetrics = filteredData.reduce((acc, report: DailyReport) => {
    return {
      totalRevenue: acc.totalRevenue + report.revenue_total,
      totalCollected: acc.totalCollected + report.revenue_collected,
      totalOutstanding: acc.totalOutstanding + report.revenue_outstanding,
      totalOutsourced: acc.totalOutsourced + report.revenue_outsourced,
      totalInstock: acc.totalInstock + report.revenue_instock,
      totalExpenses: acc.totalExpenses + report.expenses_total,
      totalCOGS: acc.totalCOGS + report.expenses_cogs,
      totalOverhead: acc.totalOverhead + report.expenses_overhead,
      totalOpEx: acc.totalOpEx + report.expenses_opex,
      totalOther: acc.totalOther + report.expenses_other,
      totalProfit: acc.totalProfit + report.net_profit,
      totalInvoices: acc.totalInvoices + report.invoices_total_count,
      totalRequisitions: acc.totalRequisitions + report.requisitions_total_count,
      totalDispatchOrders: acc.totalDispatchOrders + report.dispatch_orders_total,
      totalOutsourcedOrders: acc.totalOutsourcedOrders + report.dispatch_outsourced_count,
      totalInstockOrders: acc.totalInstockOrders + report.dispatch_instock_count,
      totalCashInflow: acc.totalCashInflow + report.cash_inflow,
      totalCashOutflow: acc.totalCashOutflow + report.cash_outflow,
      totalNetCashFlow: acc.totalNetCashFlow + report.net_cash_flow,
    };
  }, {
    totalRevenue: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    totalOutsourced: 0,
    totalInstock: 0,
    totalExpenses: 0,
    totalCOGS: 0,
    totalOverhead: 0,
    totalOpEx: 0,
    totalOther: 0,
    totalProfit: 0,
    totalInvoices: 0,
    totalRequisitions: 0,
    totalDispatchOrders: 0,
    totalOutsourcedOrders: 0,
    totalInstockOrders: 0,
    totalCashInflow: 0,
    totalCashOutflow: 0,
    totalNetCashFlow: 0,
  });

  // Calculate averages and ratios
  const avgProfitMargin = filteredData.length > 0 
    ? filteredData.reduce((sum, r) => sum + r.profit_margin_percent, 0) / filteredData.length 
    : 0;
  
  const outsourcedPercentage = aggregatedMetrics.totalRevenue > 0 
    ? (aggregatedMetrics.totalOutsourced / aggregatedMetrics.totalRevenue) * 100 
    : 0;
  
  const instockPercentage = aggregatedMetrics.totalRevenue > 0 
    ? (aggregatedMetrics.totalInstock / aggregatedMetrics.totalRevenue) * 100 
    : 0;

  // Calculate trends (comparing first half vs second half of period)
  const midPoint = Math.floor(filteredData.length / 2);
  const firstHalf = filteredData.slice(0, midPoint);
  const secondHalf = filteredData.slice(midPoint);
  
  const firstHalfRevenue = firstHalf.reduce((sum, r) => sum + r.revenue_total, 0);
  const secondHalfRevenue = secondHalf.reduce((sum, r) => sum + r.revenue_total, 0);
  const revenueTrend = firstHalfRevenue > 0 ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 : 0;

  const firstHalfExpenses = firstHalf.reduce((sum, r) => sum + r.expenses_total, 0);
  const secondHalfExpenses = secondHalf.reduce((sum, r) => sum + r.expenses_total, 0);
  const expenseTrend = firstHalfExpenses > 0 ? ((secondHalfExpenses - firstHalfExpenses) / firstHalfExpenses) * 100 : 0;

  // Add quarter functions:
  const getQuarterDates = (quarter: number) => {
    const year = new Date().getFullYear();
    const quarterStart = new Date(year, (quarter - 1) * 3, 1);
    const quarterEnd = new Date(year, quarter * 3, 0);
    return { start: quarterStart, end: quarterEnd };
  };

  const handleQuarterSelect = (quarter: number) => {
    const { start, end } = getQuarterDates(quarter);
    setStartDate(start);
    setEndDate(end);
    setShowDateFilter(false);
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare chart data
  const revenueChartData = filteredData.map((report: DailyReport) => ({
    date: format(new Date(report.report_date), 'MMM dd'),
    revenue: report.revenue_total,
    expenses: report.expenses_total,
    profit: report.net_profit
  }));

  const expenseBreakdownData = [
    { name: 'COGS', value: aggregatedMetrics.totalCOGS, color: '#3B82F6' },
    { name: 'Overhead', value: aggregatedMetrics.totalOverhead, color: '#10B981' },
    { name: 'OpEx', value: aggregatedMetrics.totalOpEx, color: '#F59E0B' },
    { name: 'Other', value: aggregatedMetrics.totalOther, color: '#EF4444' }
  ];

  const revenueSourceData = [
    { name: 'In-Stock', value: aggregatedMetrics.totalInstock, color: '#8B5CF6' },
    { name: 'Outsourced', value: aggregatedMetrics.totalOutsourced, color: '#06B6D4' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500 mt-1">Business performance insights</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            {/* Quarter Quick Select */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="text-gray-700 border-gray-300 text-sm">
                  Quick Select
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="space-y-2">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-sm"
                    onClick={() => handleQuarterSelect(1)}
                  >
                    Q1 2024
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-sm"
                    onClick={() => handleQuarterSelect(2)}
                  >
                    Q2 2024
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-sm"
                    onClick={() => handleQuarterSelect(3)}
                  >
                    Q3 2024
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-sm"
                    onClick={() => handleQuarterSelect(4)}
                  >
                    Q4 2024
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Date Range Picker */}
            <Popover open={showDateFilter} onOpenChange={setShowDateFilter}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="text-gray-700 border-gray-300 flex items-center space-x-2 text-sm">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {startDate && endDate 
                      ? `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd, yyyy')}`
                      : 'Select Date Range'
                    }
                  </span>
                  <span className="sm:hidden">
                    {startDate && endDate 
                      ? `${format(startDate, 'MM/dd')} - ${format(endDate, 'MM/dd')}`
                      : 'Date Range'
                    }
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Start Date</label>
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      className="rounded-md border mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">End Date</label>
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      className="rounded-md border mt-1"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button size="sm" variant="outline" onClick={() => setShowDateFilter(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => setShowDateFilter(false)}>
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center space-x-1 text-xs px-3 py-1 h-7"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Date Range Display */}
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600">
            <span className="font-medium">Period:</span>{" "}
            {startDate && format(startDate, "MMM dd, yyyy")}
            {startDate && endDate && " - "}
            {endDate && format(endDate, "MMM dd, yyyy")}
            <span className="ml-2 text-gray-400">
              ({filteredData.length} days)
            </span>
          </p>
        </div>

        {/* Main KPI Cards - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Revenue</p>
                  <p className="text-lg md:text-2xl font-bold text-gray-900">
                    Ksh {aggregatedMetrics.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  {revenueTrend >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${revenueTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {revenueTrend >= 0 ? '+' : ''}{revenueTrend.toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">since last period</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Profit</p>
                  <p className="text-lg md:text-2xl font-bold text-gray-900">
                    Ksh {aggregatedMetrics.totalProfit.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-xs font-medium text-gray-600">
                    {avgProfitMargin.toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">average margin</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Invoices</p>
                  <p className="text-lg md:text-2xl font-bold text-gray-900">
                    {aggregatedMetrics.totalInvoices}
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-xs font-medium text-gray-600">
                    {aggregatedMetrics.totalInvoices > 0 ? ((aggregatedMetrics.totalInvoices - filteredData.reduce((sum, r) => sum + r.invoices_pending_count, 0)) / aggregatedMetrics.totalInvoices * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">processed</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Cash Flow</p>
                  <p className="text-lg md:text-2xl font-bold text-gray-900">
                    Ksh {aggregatedMetrics.totalNetCashFlow.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  {aggregatedMetrics.totalNetCashFlow >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${aggregatedMetrics.totalNetCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {aggregatedMetrics.totalNetCashFlow >= 0 ? 'Positive' : 'Negative'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">net position</p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Metrics - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-xs font-medium text-gray-600 mb-1">Accounts Receivable</p>
                <p className="text-lg md:text-2xl font-semibold text-gray-900">
                  Ksh {aggregatedMetrics.totalOutstanding.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">pending collections</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-xs font-medium text-gray-600 mb-1">Accounts Payable</p>
                <p className="text-lg md:text-2xl font-semibold text-gray-900">
                  Ksh {aggregatedMetrics.totalExpenses.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">outstanding payments</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-xs font-medium text-gray-600 mb-1">Dispatch Orders</p>
                <p className="text-lg md:text-2xl font-semibold text-gray-900">
                  {aggregatedMetrics.totalDispatchOrders}
                </p>
                <p className="text-xs text-gray-500 mt-1">fulfillment orders</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-xs font-medium text-gray-600 mb-1">Outsourced %</p>
                <p className="text-lg md:text-2xl font-semibold text-gray-900">
                  {outsourcedPercentage.toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">of total revenue</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section - Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Revenue vs Expenses Chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-900">Revenue vs Expenses</CardTitle>
              <CardDescription className="text-xs text-gray-500">Daily performance trend</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Revenue vs Expenses Chart</p>
                  <p className="text-xs text-gray-400">Chart implementation needed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Source Breakdown */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-900">Revenue Sources</CardTitle>
              <CardDescription className="text-xs text-gray-500">In-Stock vs Outsourced breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-xs font-medium text-gray-700">In-Stock Items</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      Ksh {aggregatedMetrics.totalInstock.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">{instockPercentage.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                    <span className="text-xs font-medium text-gray-700">Outsourced Items</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      Ksh {aggregatedMetrics.totalOutsourced.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">{outsourcedPercentage.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Total Revenue</span>
                    <span className="font-semibold text-gray-900">Ksh {aggregatedMetrics.totalRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expense Analysis - Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-900">Expense Breakdown</CardTitle>
              <CardDescription className="text-xs text-gray-500">Cost analysis by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expenseBreakdownData.map((expense) => (
                  <div key={expense.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: expense.color }}
                      ></div>
                      <span className="text-xs font-medium text-gray-700">{expense.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        Ksh {expense.value.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {aggregatedMetrics.totalExpenses > 0 
                          ? ((expense.value / aggregatedMetrics.totalExpenses) * 100).toFixed(1) 
                          : 0}%
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Total Expenses</span>
                    <span className="font-semibold text-gray-900">Ksh {aggregatedMetrics.totalExpenses.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-900">Performance Summary</CardTitle>
              <CardDescription className="text-xs text-gray-500">Key business insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-xs font-medium text-green-800">Profit Margin</p>
                    <p className="text-lg font-bold text-green-900">{avgProfitMargin.toFixed(1)}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-green-600">
                      {avgProfitMargin > 60 ? 'Excellent' : avgProfitMargin > 50 ? 'Good' : 'Needs Improvement'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-xs font-medium text-blue-800">Outsourcing Ratio</p>
                    <p className="text-lg font-bold text-blue-900">{outsourcedPercentage.toFixed(0)}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-blue-600">
                      {outsourcedPercentage > 40 ? 'High Outsourcing' : 'Balanced Mix'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div>
                    <p className="text-xs font-medium text-purple-800">Cash Position</p>
                    <p className="text-lg font-bold text-purple-900">
                      {aggregatedMetrics.totalNetCashFlow >= 0 ? '+' : ''}Ksh {Math.abs(aggregatedMetrics.totalNetCashFlow).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-purple-600">
                      {aggregatedMetrics.totalNetCashFlow >= 0 ? 'Positive' : 'Negative'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}