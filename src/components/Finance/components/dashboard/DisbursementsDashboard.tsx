import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle,
  Plus,
  Eye,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  Calendar,
  ChevronDown,
  CalendarIcon
} from "lucide-react";
import { User } from "@/types/requisition";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cfg } from "@/lib/config";

interface DisbursementsDashboardProps {
  currentUser: User;
  requisitions: any[];
  onAction: (action: string, data: any) => void;
}

interface FloatBalance {
  currentBalance: number;
  weeklyReleased: number;
  totalLoaded: number;
  totalSpent: number;
  lastUpdated: string;
  recentTransactions?: any[];
}

interface DashboardKPIs {
  unpaidRequisitions: number;
  unconfirmedRequisitions: number;
  cogsUnpaid: number;
  totalPending: number;
  averageProcessingTime: number;
}

interface ChartDataPoint {
  category: string;
  amount: number;
  period: string;
}

type TimePeriod = 'weekly' | 'monthly' | 'quarterly' | 'custom';

export function DisbursementsDashboard({ currentUser, requisitions, onAction }: DisbursementsDashboardProps) {
  const [floatBalance, setFloatBalance] = useState<FloatBalance>({
    currentBalance: 0,
    weeklyReleased: 0,
    totalLoaded: 0,
    totalSpent: 0,
    lastUpdated: new Date().toISOString()
  });
  
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showRecentTransactions, setShowRecentTransactions] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('weekly');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  
  // Date inputs for filtering (simple HTML date strings)
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // NEW: Date range state for calendar picker
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });

  // Update the KPIs calculation to handle empty data
  const kpis: DashboardKPIs = {
    unpaidRequisitions: (requisitions || []).filter(r => r.paymentStatus === 'Unpaid').length,
    unconfirmedRequisitions: (requisitions || []).filter(r => r.paymentStatus === 'Paid' && r.receiptStatus !== 'Received').length,
    cogsUnpaid: (requisitions || []).filter(r => r.paymentStatus === 'Unpaid' && r.expenseCategory === 'Cost of Revenue (COGS)').length,
    totalPending: (requisitions || []).filter(r => r.paymentStatus === 'Unpaid').reduce((sum, r) => sum + (r.totalAmount || 0), 0),
    averageProcessingTime: 2.5
  };

  // Calculate period amounts (date filter if provided, otherwise current week)
  const getPeriodBounds = () => {
    if (startDate && endDate) {
      const from = new Date(startDate);
      const to = new Date(endDate);
      // normalize to include whole end day
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    const now = new Date();
    const weekStart = new Date(now);
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekStart.setDate(now.getDate() + daysToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return { from: weekStart, to: weekEnd };
  };

  const getPeriodAmounts = () => {
    const { from, to } = getPeriodBounds();
    const txns = (floatBalance?.recentTransactions || []).filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= from && transactionDate <= to;
    });

    const periodCredits = txns
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const periodDebits = txns
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return { periodCredits, periodDebits };
  };

  const { periodCredits, periodDebits } = getPeriodAmounts();

  // (moved startDate/endDate declarations above period helpers)

  // Update the account balance calculation to use the correct data source
  const calculateAccountBalance = () => {
    console.log('=== CALCULATING ACCOUNT BALANCE ===');
    console.log('startDate:', startDate);
    console.log('endDate:', endDate);
    console.log('floatBalance:', floatBalance);
    
    // Always use the values from floatBalance directly (Apps Script does all calculations)
    const currentBalance = floatBalance?.currentBalance || 0;
    const credits = floatBalance?.totalLoaded || 0;
    const debits = floatBalance?.totalSpent || 0;
    
    console.log('Final values - Balance:', currentBalance, 'Credits:', credits, 'Debits:', debits);
    
    return {
      currentBalance,
      credits,
      debits
    };
  };

  const [accountBalance, setAccountBalance] = useState({ currentBalance: 0, credits: 0, debits: 0 });

  // Generate chart data by category for the selected time period or custom date range
  const generateChartData = (period: TimePeriod) => {
    // Always show all 4 categories, even if they have 0 amounts
    const allCategories = ["Cost of Revenue (COGS)", "Overhead Costs", "Operating Expenses (OpEx)", "Other"];
    const paidRequisitions = requisitions.filter(r => r.paymentStatus === 'Paid');
    const data: ChartDataPoint[] = [];
    const hasCustomRange = Boolean(startDate && endDate);
    const customFrom = hasCustomRange ? new Date(startDate as string) : undefined;
    const customTo = hasCustomRange ? new Date(endDate as string) : undefined;
    if (customTo) customTo.setHours(23, 59, 59, 999);
    
    allCategories.forEach(category => {
      let totalAmount = 0;
      
      if (hasCustomRange) {
        const categoryRequisitions = paidRequisitions.filter(req => {
          const paymentDate = new Date(req.paymentDate || req.createdDate);
          return req.expenseCategory === category &&
                 customFrom && customTo && paymentDate >= customFrom && paymentDate <= (customTo as Date);
        });
        categoryRequisitions.forEach(req => {
          let actualAmount = req.totalAmount;
          if (req.paymentDetails && req.paymentDetails !== '') {
            try {
              const paymentData = JSON.parse(req.paymentDetails);
              const amountPaid = parseFloat(paymentData.amountPaid || 0);
              const transactionCost = parseFloat(paymentData.transactionCost || 0);
              actualAmount = amountPaid + transactionCost;
            } catch (e) {
              actualAmount = req.totalAmount;
            }
          }
          totalAmount += actualAmount;
        });
      } else if (period === 'weekly') {
        const now = new Date();
        const weekStart = new Date(now);
        // Fix: Get Monday of current week (Monday to Sunday)
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, so go back 6 days to get Monday
        weekStart.setDate(now.getDate() + daysToMonday);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // Sunday
        
        // FIX: Use paymentDate instead of createdDate for paid requisitions
        const categoryRequisitions = paidRequisitions.filter(req => {
          const paymentDate = new Date(req.paymentDate || req.createdDate); // Use paymentDate if available
          return req.expenseCategory === category && 
                 paymentDate >= weekStart && 
                 paymentDate <= weekEnd;
        });
        
        categoryRequisitions.forEach(req => {
          let actualAmount = req.totalAmount;
          if (req.paymentDetails && req.paymentDetails !== '') {
            try {
              const paymentData = JSON.parse(req.paymentDetails);
              const amountPaid = parseFloat(paymentData.amountPaid || 0);
              const transactionCost = parseFloat(paymentData.transactionCost || 0);
              actualAmount = amountPaid + transactionCost;
            } catch (e) {
              actualAmount = req.totalAmount;
            }
          }
          totalAmount += actualAmount;
        });
      } else if (period === 'monthly') {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const categoryRequisitions = paidRequisitions.filter(req => {
          const paymentDate = new Date(req.paymentDate || req.createdDate); // Use paymentDate if available
          return req.expenseCategory === category && 
                 paymentDate >= monthStart && 
                 paymentDate <= monthEnd;
        });
        
        categoryRequisitions.forEach(req => {
          let actualAmount = req.totalAmount;
          if (req.paymentDetails && req.paymentDetails !== '') {
            try {
              const paymentData = JSON.parse(req.paymentDetails);
              const amountPaid = parseFloat(paymentData.amountPaid || 0);
              const transactionCost = parseFloat(paymentData.transactionCost || 0);
              actualAmount = amountPaid + transactionCost;
            } catch (e) {
              actualAmount = req.totalAmount;
            }
          }
          totalAmount += actualAmount;
        });
      } else if (period === 'quarterly') {
        const now = new Date();
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
        
        const categoryRequisitions = paidRequisitions.filter(req => {
          const paymentDate = new Date(req.paymentDate || req.createdDate); // Use paymentDate if available
          return req.expenseCategory === category && 
                 paymentDate >= quarterStart && 
                 paymentDate <= quarterEnd;
        });
        
        categoryRequisitions.forEach(req => {
          let actualAmount = req.totalAmount;
          if (req.paymentDetails && req.paymentDetails !== '') {
            try {
              const paymentData = JSON.parse(req.paymentDetails);
              const amountPaid = parseFloat(paymentData.amountPaid || 0);
              const transactionCost = parseFloat(paymentData.transactionCost || 0);
              actualAmount = amountPaid + transactionCost;
            } catch (e) {
              actualAmount = req.totalAmount;
            }
          }
          totalAmount += actualAmount;
        });
      }
      
      data.push({
        category: category,
        amount: totalAmount,
        period: hasCustomRange
          ? `Custom Range`
          : (period === 'weekly' ? 'This Week' : period === 'monthly' ? 'This Month' : 'This Quarter')
      });
    });
    
    return data.sort((a, b) => b.amount - a.amount);
  };

  // Add this useEffect to fetch data on component mount
  useEffect(() => {
    fetchFloatBalance();
  }, []); // Empty dependency array means this runs once on mount

  // Add this useEffect to refetch float balance when date filter changes
  useEffect(() => {
    fetchFloatBalance();
  }, [startDate, endDate]); // This will refetch when date range changes

  // Update the chart data useEffect to use date filter
  useEffect(() => {
    const chartData = generateChartData(timePeriod);
    setChartData(chartData);
  }, [startDate, endDate, requisitions]); // Use startDate/endDate instead of timePeriod

  useEffect(() => {
    const balance = calculateAccountBalance();
    setAccountBalance(balance);
  }, [floatBalance]);
  
    useEffect(() => {
    if (floatBalance?.recentTransactions) {
      setRecentTransactions(floatBalance.recentTransactions);
    }
  }, [floatBalance]);

  const handleAddFunds = async () => {
    if (!fundAmount || parseFloat(fundAmount) <= 0) return;
    
    setIsLoading(true);
    try {
      // Call your Apps Script URL here - replace with your actual URL
      const response = await fetch(cfg.requisitionsScript, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'addFloatFunds', 
          data: { 
            amount: parseFloat(fundAmount), 
            addedBy: currentUser.name 
          }
        })
      });
      
      const result = await response.json();
      if (result.status === 'success') {
        setFundAmount("");
        setShowAddFunds(false);
        toast.success('Funds added successfully');
        // Refresh the float balance immediately
        await fetchFloatBalance();
      } else {
        toast.error('Failed to add funds: ' + result.message);
      }
    } catch (error) {
      console.error('Error adding funds:', error);
      toast.error('Failed to add funds. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFloatBalance = async () => {
    try {
      console.log('Fetching float balance...');
      
      const requestBody = { 
        action: 'getFloatBalance',
        data: {}
      };
      
      if (startDate && endDate) {
        requestBody.data = {
          ...requestBody.data,
          startDate: startDate,
          endDate: endDate
        };
      }
      
      const response = await fetch(cfg.requisitionsScript, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(requestBody)
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Float balance response:', data);
      
      if (data.status === 'success') {
        // Update the state with the correct data structure
        setFloatBalance({
          currentBalance: data.currentBalance,
          totalLoaded: data.totalLoaded || data.credits,
          totalSpent: data.totalSpent || data.debits,
          weeklyReleased: data.weeklyReleased,
          lastUpdated: data.lastUpdated,
          recentTransactions: data.recentTransactions || []
        });
        console.log('Float balance state updated');
      } else {
        console.error('Float balance fetch failed:', data.message);
      }
    } catch (error) {
      console.error('Error fetching float balance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewCategory = (category: string) => {
    // Filter requisitions by category and unpaid status
    const filteredRequisitions = requisitions.filter(r => 
      r.paymentStatus === 'Unpaid' && r.expenseCategory === category
    );
    
    // You can either show a modal with the list or navigate to a filtered view
    // For now, let's show an alert with the count
    toast.info(`Found ${filteredRequisitions.length} unpaid ${category} requisitions`);
    
    // If you want to show a modal, you can add state for that
    console.log('Unpaid COGS requisitions:', filteredRequisitions);
  };

  const handleChartClick = (dataPoint: ChartDataPoint) => {
    console.log('Chart clicked:', dataPoint);
  };

  const maxAmount = Math.max(...chartData.map(d => d.amount));
  const totalSpent = chartData.reduce((sum, d) => sum + d.amount, 0);

  // Color palette for different categories
  const getCategoryColor = (index: number) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-emerald-500 to-emerald-600', 
      'from-amber-500 to-amber-600',
      'from-purple-500 to-purple-600',
      'from-red-500 to-red-600',
      'from-indigo-500 to-indigo-600'
    ];
    return colors[index % colors.length];
  };

  // Add refresh function that calls the parent's refresh
  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      // Refresh requisitions data from parent
      await onAction('refresh', {});
      // Also refresh float balance
      await fetchFloatBalance();
      toast.success('Dashboard refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // Add export function
  const handleExport = () => {
    // Prepare data for export
    const exportData = {
      dashboardInfo: {
        exportDate: new Date().toISOString(),
        exportedBy: currentUser.name,
        timePeriod: timePeriod
      },
      floatBalance: floatBalance,
      kpis: kpis,
      chartData: chartData,
      totalPaidAmount: periodDebits,
      recentTransactions: recentTransactions,
      requisitions: requisitions.map(req => ({
        id: req.id,
        createdDate: req.createdDate,
        createdBy: req.createdBy,
        expenseCategory: req.expenseCategory,
        expenseClass: req.expenseClass,
        expenseType: req.expenseType,
        totalAmount: req.totalAmount,
        approvalStatus: req.approvalStatus,
        paymentStatus: req.paymentStatus,
        supplierName: req.supplierName,
        paymentDetails: req.paymentDetails
      }))
    };

    // Create and download JSON file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `disbursements-dashboard-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Dashboard data exported successfully');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Accounts Payables</h1>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Filter by Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">
                  End Date
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button 
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                variant="outline"
                className="mb-1"
              >
                Clear Filter
              </Button>
            </div>
            {startDate && endDate && (
              <p className="text-sm text-gray-600 mt-2">
                Showing transactions from {format(new Date(startDate), 'MMM dd, yyyy')} to {format(new Date(endDate), 'MMM dd, yyyy')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Row - Main Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Current Account Balance - UPDATED WITH CALENDAR */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-blue-900 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
                Current Account Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-3xl font-bold text-blue-900">
                  KSh {(accountBalance?.currentBalance || 0).toLocaleString()}
                </div>
                <div className="text-sm text-blue-700">
                  Credits: {(accountBalance?.credits || 0).toLocaleString()} | Debits: {(accountBalance?.debits || 0).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Released in selected period (falls back to current week) */}
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{startDate && endDate ? 'Released in Period' : 'Released This Week'}</p>
                  <p className="text-3xl font-semibold text-slate-900 mt-2">
              KSh {periodCredits.toLocaleString()}
                  </p>
                  <div className="flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" />
                    <span className="text-xs text-emerald-600">{startDate && endDate ? 'Credits in period' : 'Credits this week'}</span>
                  </div>
                </div>
                <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Paid Amount in selected period (falls back to current week) */}
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Paid Amount</p>
                  <p className="text-3xl font-semibold text-slate-900 mt-2">
                    KSh {periodDebits.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{startDate && endDate ? 'Debits in period' : 'Debits this week'}</p>
                </div>
                <div className="h-12 w-12 bg-slate-50 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add Funds Button with Recent Transactions (Add Funds hidden for Finance) */}
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="text-center space-y-3">
                {currentUser.role !== 'Finance' && (
                  <Button 
                    onClick={() => setShowAddFunds(true)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Funds
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowRecentTransactions(!showRecentTransactions)}
                  className="w-full text-slate-600 border-slate-300"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Recent Transactions
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions Modal */}
        {showRecentTransactions && (
          <Card className="border-0 shadow-lg bg-white max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Recent Transactions
                <Button variant="ghost" size="sm" onClick={() => setShowRecentTransactions(false)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${
                          transaction.type === 'credit' ? 'bg-emerald-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{transaction.description}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(transaction.date).toLocaleDateString()} by {transaction.user}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${
                          transaction.type === 'credit' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'credit' ? '+' : '-'}KSh {(transaction.amount || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500 capitalize">{transaction.type}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-500 py-4">No recent transactions</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Funds Modal (hidden for Finance) */}
        {currentUser.role !== 'Finance' && showAddFunds && (
          <Card className="border-0 shadow-lg bg-white max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-lg">Add Funds to Float Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fundAmount">Amount (KSh)</Label>
                <Input
                  id="fundAmount"
                  type="number"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddFunds(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddFunds}
                  disabled={isLoading}
                  className="flex-1 bg-slate-900 hover:bg-slate-800"
                >
                  {isLoading ? "Adding..." : "Add Funds"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Unconfirmed */}
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Unconfirmed</p>
                  <p className="text-2xl font-semibold text-red-600 mt-1">{kpis.unconfirmedRequisitions}</p>
                  {kpis.unconfirmedRequisitions > 0 && (
                    <Badge variant="destructive" className="text-xs mt-1">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Action Required
                    </Badge>
                  )}
                </div>
                <div className="h-10 w-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* COGS Unpaid */}
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">COGS Unpaid</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1">{kpis.cogsUnpaid}</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleViewCategory('Cost of Revenue (COGS)')}
                    className="text-xs p-0 h-auto mt-1 text-blue-600 hover:text-blue-700"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                </div>
                <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Unpaid Requisitions */}
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Unpaid Requisitions</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1">
                    KSh {(kpis?.totalPending || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {kpis.unpaidRequisitions} requisitions pending
                  </p>
                </div>
                <div className="h-10 w-10 bg-slate-50 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average Processing Time */}
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Avg Processing Time</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1">
                    {kpis.averageProcessingTime} days
                  </p>
                  <p className="text-xs text-slate-500 mt-1">From request to payment</p>
                </div>
                <div className="h-10 w-10 bg-slate-50 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Expenditure Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-0 shadow-sm bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Expenditure by Category
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Select value={timePeriod} onValueChange={(value: TimePeriod) => setTimePeriod(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80 space-y-4">
                {/* Total Amount Display */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Total Amount Spent</p>
                      <p className="text-2xl font-bold text-slate-900">
                        KSh {(totalSpent || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Period</p>
                      <p className="text-sm font-medium text-slate-700 capitalize">{startDate && endDate ? `${format(new Date(startDate), 'MMM d, yyyy')} - ${format(new Date(endDate), 'MMM d, yyyy')}` : timePeriod}</p>
                    </div>
                  </div>
                </div>

                {/* Chart Area - PowerBI Style Slim Bars */}
                <div className="h-48 flex items-end justify-between gap-2 px-4">
                  {chartData.map((dataPoint, index) => (
                    <div 
                      key={index}
                      className="flex flex-col items-center group cursor-pointer flex-1 max-w-[80px]"
                      onClick={() => handleChartClick(dataPoint)}
                    >
                      {/* Tooltip */}
                      <div className="mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-900 text-white text-xs px-2 py-1 rounded-md absolute -translate-y-8 z-10 whitespace-nowrap">
                        <div className="font-semibold">{dataPoint.category}</div>
                        <div>KSh {(dataPoint.amount || 0).toLocaleString()}</div>
                      </div>
                      
                      {/* Bar - Make it slimmer and more PowerBI-like */}
                      <div 
                        className={`w-8 bg-gradient-to-t ${getCategoryColor(index)} rounded-t-sm transition-all duration-200 group-hover:scale-105 shadow-sm`}
                        style={{ 
                          height: `${maxAmount > 0 ? (dataPoint.amount / maxAmount) * 160 : 0}px`,
                          minHeight: dataPoint.amount > 0 ? '4px' : '0px'
                        }}
                      />
                      
                      {/* Category Label - Make it more compact */}
                      <div className="text-xs text-slate-600 mt-2 text-center leading-tight max-w-[60px]">
                        {dataPoint.category.split(' ').slice(0, 2).join(' ')}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Chart Legend */}
                <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100">
                  {chartData.map((dataPoint, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full bg-gradient-to-r ${getCategoryColor(index)}`} />
                      <span className="text-xs text-slate-600">{dataPoint.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">Category Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {chartData.map((dataPoint, index) => {
                  const percentage = totalSpent > 0 ? (dataPoint.amount / totalSpent) * 100 : 0;
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full bg-gradient-to-r ${getCategoryColor(index)}`} />
                          <span className="text-sm font-medium text-slate-700">{dataPoint.category}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">
                          KSh {(dataPoint.amount || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{percentage.toFixed(1)}% of total</span>
                        <span>{dataPoint.period}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div 
                          className={`bg-gradient-to-r ${getCategoryColor(index)} h-2 rounded-full transition-all duration-300`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requisitions.slice(0, 8).map((req, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      req.paymentStatus === 'Paid' ? 'bg-emerald-500' : 
                      req.paymentStatus === 'Unpaid' ? 'bg-amber-500' : 'bg-slate-300'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{req.id}</p>
                      <p className="text-xs text-slate-500">{req.expenseCategory}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      KSh {(req.totalAmount || 0).toLocaleString()}
                    </p>
                    <Badge 
                      variant={req.paymentStatus === 'Paid' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {req.paymentStatus}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
