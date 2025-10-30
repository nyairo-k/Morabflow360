import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Inventory/components/ui/card";
import { Button } from "@/components/Inventory/components/ui/button";
import { Badge } from "@/components/Inventory/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/Inventory/components/ui/tabs";
import { 
  Package, 
  ClipboardList, 
  FileText, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  BarChart3,
  ShoppingCart,
  Building,
  User,
  Truck,
  Star,
  Activity
} from 'lucide-react';
import type { Invoice, PurchaseOrder, DispatchOrder, Requisition } from "@/components/Inventory/types";
import { User } from "@/types/requisition";

interface InventoryDashboardProps {
  currentUser: User;
  invoices: Invoice[];
  purchaseOrders: PurchaseOrder[];
  dispatchOrders: DispatchOrder[];
  requisitions: Requisition[];
  onNavigateToSection: (section: string) => void;
}

export function InventoryDashboard({
  currentUser,
  invoices,
  purchaseOrders,
  dispatchOrders,
  requisitions,
  onNavigateToSection
}: InventoryDashboardProps) {

  // Calculate KPIs
  const kpis = useMemo(() => {
    // Requisitions Awaiting Action (paymentStatus is 'Paid')
    const requisitionsAwaitingAction = requisitions.filter(req => req.paymentStatus === 'Paid').length;

    // Invoices Awaiting Fulfillment
    const invoicesAwaitingFulfillment = invoices.filter(inv => inv.fulfillmentStatus === 'AWAITING_FULFILLMENT').length;

    // Items Dispatched This Week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const itemsDispatchedThisWeek = dispatchOrders
      .filter(order => new Date(order.assignmentDate) >= oneWeekAgo)
      .reduce((sum, order) => sum + (order.quantityToDispatch || 0), 0);

    // Most Requested Product
    const productCounts = dispatchOrders.reduce((acc, order) => {
      acc[order.productId] = (acc[order.productId] || 0) + (order.quantityToDispatch || 0);
      return acc;
    }, {} as Record<string, number>);
    
    const mostRequestedProduct = Object.entries(productCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    return {
      requisitionsAwaitingAction,
      invoicesAwaitingFulfillment,
      itemsDispatchedThisWeek,
      mostRequestedProduct
    };
  }, [requisitions, invoices, dispatchOrders]);

  // Fulfillment Source Breakdown
  const fulfillmentBreakdown = useMemo(() => {
    const breakdown = dispatchOrders.reduce((acc, order) => {
      const source = order.sourceDetails || 'Unknown';
      acc[source] = (acc[source] || 0) + (order.quantityToDispatch || 0);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(breakdown).map(([source, count]) => ({
      source: source.replace(' Store', '').replace(' Stock', ''),
      count,
      percentage: (count / dispatchOrders.reduce((sum, order) => sum + (order.quantityToDispatch || 0), 0)) * 100
    }));
  }, [dispatchOrders]);

  const getSourceIcon = (source: string) => {
    if (source.includes('Main HQ') || source.includes('Main')) return <Building className="h-4 w-4" />;
    if (source.includes('Nyamira')) return <Building className="h-4 w-4" />;
    if (source.includes('Field Rep') || source.includes('Rep')) return <User className="h-4 w-4" />;
    if (source.includes('Outsource')) return <ShoppingCart className="h-4 w-4" />;
    return <Package className="h-4 w-4" />;
  };

  const getSourceColor = (source: string) => {
    if (source.includes('Main HQ') || source.includes('Main')) return 'bg-blue-500';
    if (source.includes('Nyamira')) return 'bg-green-500';
    if (source.includes('Field Rep') || source.includes('Rep')) return 'bg-purple-500';
    if (source.includes('Outsource')) return 'bg-orange-500';
    return 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Inventory Command Center
            </h1>
            <p className="text-lg text-gray-600 mt-2 font-medium">
              Welcome back, {currentUser.name}! Here's what needs your attention today.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-green-500 animate-pulse" />
            <span className="text-sm font-medium text-gray-600">Live Dashboard</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Requisitions Awaiting Action */}
        <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-red-50 to-pink-100 hover:from-red-100 hover:to-pink-200 cursor-pointer transform hover:-translate-y-1">
          <CardContent className="p-6" onClick={() => onNavigateToSection('requisitions')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-red-600 uppercase tracking-wide">Action Required</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{kpis.requisitionsAwaitingAction}</p>
                <p className="text-sm text-gray-600 mt-1">Requisitions to Confirm</p>
              </div>
              <div className="p-3 bg-red-500 rounded-full group-hover:scale-110 transition-transform">
                <ClipboardList className="h-6 w-6 text-white" />
              </div>
            </div>
            {kpis.requisitionsAwaitingAction > 0 && (
              <div className="mt-4 flex items-center text-red-600">
                <AlertTriangle className="h-4 w-4 mr-1" />
                <span className="text-xs font-medium">Click to review</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoices Awaiting Fulfillment */}
        <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-amber-50 to-yellow-100 hover:from-amber-100 hover:to-yellow-200 cursor-pointer transform hover:-translate-y-1">
          <CardContent className="p-6" onClick={() => onNavigateToSection('inventory')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-600 uppercase tracking-wide">Pending Assignment</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{kpis.invoicesAwaitingFulfillment}</p>
                <p className="text-sm text-gray-600 mt-1">Invoices to Fulfill</p>
              </div>
              <div className="p-3 bg-amber-500 rounded-full group-hover:scale-110 transition-transform">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
            {kpis.invoicesAwaitingFulfillment > 0 && (
              <div className="mt-4 flex items-center text-amber-600">
                <Clock className="h-4 w-4 mr-1" />
                <span className="text-xs font-medium">Click to assign</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items Dispatched This Week */}
        <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-green-50 to-emerald-100 hover:from-green-100 hover:to-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-600 uppercase tracking-wide">This Week</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{kpis.itemsDispatchedThisWeek}</p>
                <p className="text-sm text-gray-600 mt-1">Items Dispatched</p>
              </div>
              <div className="p-3 bg-green-500 rounded-full group-hover:scale-110 transition-transform">
                <Truck className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span className="text-xs font-medium">Great progress!</span>
            </div>
          </CardContent>
        </Card>

        {/* Most Requested Product */}
        <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-purple-50 to-violet-100 hover:from-purple-100 hover:to-violet-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-600 uppercase tracking-wide">Top Product</p>
                <p className="text-lg font-bold text-gray-900 mt-2 truncate">{kpis.mostRequestedProduct}</p>
                <p className="text-sm text-gray-600 mt-1">Most Requested</p>
              </div>
              <div className="p-3 bg-purple-500 rounded-full group-hover:scale-110 transition-transform">
                <Star className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-purple-600">
              <BarChart3 className="h-4 w-4 mr-1" />
              <span className="text-xs font-medium">High demand</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-1">
          <TabsTrigger 
            value="analytics" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-lg font-semibold transition-all"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger 
            value="operations" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white rounded-lg font-semibold transition-all"
          >
            <Package className="h-4 w-4 mr-2" />
            Operations
          </TabsTrigger>
          <TabsTrigger 
            value="insights" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-500 data-[state=active]:text-white rounded-lg font-semibold transition-all"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          {/* Fulfillment Source Breakdown */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-t-xl">
              <CardTitle className="flex items-center text-xl font-bold">
                <BarChart3 className="h-6 w-6 mr-3" />
                Fulfillment Source Breakdown
              </CardTitle>
              <p className="text-blue-100 mt-2">Distribution of items across fulfillment sources</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {fulfillmentBreakdown.map((item, index) => (
                  <div key={index} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${getSourceColor(item.source)} text-white`}>
                          {getSourceIcon(item.source)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{item.source}</h4>
                          <p className="text-sm text-gray-600">{item.count} items</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{item.percentage.toFixed(1)}%</p>
                        <p className="text-xs text-gray-500">of total</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-full ${getSourceColor(item.source)} transition-all duration-1000 ease-out group-hover:opacity-80`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Dispatch Orders */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-t-xl">
                <CardTitle className="flex items-center text-xl font-bold">
                  <Truck className="h-6 w-6 mr-3" />
                  Recent Dispatches
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {dispatchOrders.slice(0, 5).map((order, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Package className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{order.productId}</p>
                          <p className="text-sm text-gray-600">Qty: {order.quantityToDispatch}</p>
                        </div>
                      </div>
                      <Badge variant={order.dispatchApprovalStatus === 'Approved' ? 'default' : 'secondary'}>
                        {order.dispatchApprovalStatus}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Purchase Orders Status */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-xl">
                <CardTitle className="flex items-center text-xl font-bold">
                  <ShoppingCart className="h-6 w-6 mr-3" />
                  Purchase Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {purchaseOrders.slice(0, 5).map((po, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <ShoppingCart className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{po.supplierName}</p>
                          <p className="text-sm text-gray-600">PO: {po.poId}</p>
                        </div>
                      </div>
                      <Badge variant={po.paymentStatusToSupplier === 'PAID' ? 'default' : 'destructive'}>
                        {po.paymentStatusToSupplier}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-t-xl">
              <CardTitle className="flex items-center text-xl font-bold">
                <TrendingUp className="h-6 w-6 mr-3" />
                Performance Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl">
                  <div className="p-3 bg-blue-500 rounded-full w-fit mx-auto mb-4">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Efficiency Rate</h3>
                  <p className="text-3xl font-bold text-blue-600 mt-2">94%</p>
                  <p className="text-sm text-gray-600 mt-1">On-time fulfillment</p>
                </div>
                
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl">
                  <div className="p-3 bg-green-500 rounded-full w-fit mx-auto mb-4">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Growth</h3>
                  <p className="text-3xl font-bold text-green-600 mt-2">+23%</p>
                  <p className="text-sm text-gray-600 mt-1">vs last month</p>
                </div>
                
                <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl">
                  <div className="p-3 bg-purple-500 rounded-full w-fit mx-auto mb-4">
                    <Star className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Quality Score</h3>
                  <p className="text-3xl font-bold text-purple-600 mt-2">4.8</p>
                  <p className="text-sm text-gray-600 mt-1">Out of 5.0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
