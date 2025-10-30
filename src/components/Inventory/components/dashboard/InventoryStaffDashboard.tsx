import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  ClipboardList, 
  FileText, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  Calendar,
  RefreshCw
} from 'lucide-react';
import type { DispatchOrder, Requisition } from "@/components/Inventory/types";
import { cfg } from "@/lib/config";
import { User as UserType } from "@/types/requisition";

interface InventoryStaffDashboardProps {
  currentUser: UserType;
  dispatchOrders: DispatchOrder[];
  requisitions: Requisition[];
  onNavigateToSection: (section: string) => void;
}

interface RequisitionStats {
  actionRequired: number;
  toDo: number;
  awaitingApproval: number;
  completed: number;
}

export function InventoryStaffDashboard({
  currentUser,
  dispatchOrders,
  requisitions,
  onNavigateToSection
}: InventoryStaffDashboardProps) {
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter'>('week');
  const [stats, setStats] = useState<RequisitionStats>({
    actionRequired: 0,
    toDo: 0,
    awaitingApproval: 0,
    completed: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch requisition stats from Apps Script (Action Required card) - KEEP EXACTLY AS IS
  const fetchRequisitionStats = async () => {
    try {
      setLoading(true);
      const REQUISITIONS_SCRIPT_URL = cfg.requisitionsScript;
      
      console.log('Fetching from:', REQUISITIONS_SCRIPT_URL);
      
      const response = await fetch(REQUISITIONS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'getRequisitionStats',
          data: {}
        })
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('API Response:', result);
      
      if (result.status === 'success' && result.actionRequired !== undefined) {
        console.log('Data received:', result);
        
        // Only update the actionRequired from the App Script response
        setStats(prevStats => ({
          ...prevStats,
          actionRequired: result.actionRequired || 0
        }));
        
        console.log('Updated actionRequired:', result.actionRequired);
      } else {
        console.log('API response not successful or no data:', result);
        setStats(prevStats => ({
          ...prevStats,
          actionRequired: 0
        }));
      }
    } catch (error) {
      console.error('Error fetching requisition stats:', error);
      // Set actionRequired to -1 to indicate error
      setStats(prevStats => ({
        ...prevStats,
        actionRequired: -1
      }));
    } finally {
      setLoading(false);
    }
  };

  // NEW: Fetch inventory stats from Apps Script (To-Do, Awaiting Approval, Completed cards)
  const fetchInventoryStats = async () => {
    try {
      const INVENTORY_SCRIPT_URL = cfg.inventoryScript;
      
      console.log('Fetching inventory stats from:', INVENTORY_SCRIPT_URL);
      
      const response = await fetch(INVENTORY_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'getInventoryStats',
          data: {}
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Inventory stats response:', result);
      
      if (result.status === 'success') {
        setStats(prevStats => ({
          ...prevStats,
          toDo: result.toDo || 0,
          awaitingApproval: result.awaitingApproval || 0,
          completed: result.completed || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
      setStats(prevStats => ({
        ...prevStats,
        toDo: -1,
        awaitingApproval: -1,
        completed: -1
      }));
    }
  };

  // Handle refresh button click
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchRequisitionStats(),
        fetchInventoryStats()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequisitionStats(); // Keep this exactly as it was
    fetchInventoryStats();   // Add this new function
  }, []);

  // Update the KPI cards to use the fetched stats
  const kpis = useMemo(() => stats, [stats]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium text-slate-900 mb-1">Inventory Dashboard</h1>
            <p className="text-sm text-slate-600">Welcome back, {currentUser.name}</p>
          </div>
          <Button 
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Action Required */}
        <Card 
          className="border border-slate-200 bg-white hover:shadow-sm transition-shadow cursor-pointer"
          onClick={() => onNavigateToSection('requisitions')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-normal mb-1">Action Required</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {loading ? '...' : kpis.actionRequired}
                </p>
                <p className="text-xs text-slate-500">Paid-Awaiting Receipt</p>
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <ClipboardList className="h-4 w-4 text-red-600" />
              </div>
            </div>
            {kpis.actionRequired > 0 && !loading && (
              <div className="mt-3 flex items-center text-xs text-red-600">
                <ArrowRight className="h-3 w-3 mr-1" />
                <span>View requisitions</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* To-Do */}
        <Card 
          className="border border-slate-200 bg-white hover:shadow-sm transition-shadow cursor-pointer"
          onClick={() => onNavigateToSection('inventory')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-normal mb-1">To-Do</p>
                <p className="text-2xl font-semibold text-slate-900">{kpis.toDo}</p>
                <p className="text-xs text-slate-500">Awaiting fulfillment</p>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg">
                <FileText className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            {kpis.toDo > 0 && (
              <div className="mt-3 flex items-center text-xs text-amber-600">
                <ArrowRight className="h-3 w-3 mr-1" />
                <span>Assign fulfillment</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Awaiting Dispatch Approval */}
        <Card 
          className="border border-slate-200 bg-white hover:shadow-sm transition-shadow cursor-pointer"
          onClick={() => onNavigateToSection('inventory')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-normal mb-1">Awaiting Approval</p>
                <p className="text-2xl font-semibold text-slate-900">{kpis.awaitingApproval}</p>
                <p className="text-xs text-slate-500">Dispatch orders</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            {kpis.awaitingApproval > 0 && (
              <div className="mt-3 flex items-center text-xs text-blue-600">
                <ArrowRight className="h-3 w-3 mr-1" />
                <span>Review orders</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed Items */}
        <Card className="border border-slate-200 bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-normal mb-1">Completed</p>
                <p className="text-2xl font-semibold text-slate-900">{kpis.completed}</p>
                <p className="text-xs text-slate-500">This {dateRange}</p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <div className="mt-3 flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>On track</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Range Filter */}
      <div className="mb-6">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-600">Time period:</span>
          <div className="flex space-x-1">
            {(['week', 'month', 'quarter'] as const).map((period) => (
              <Button
                key={period}
                variant={dateRange === period ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDateRange(period)}
                className={`text-xs h-7 px-3 ${
                  dateRange === period 
                    ? 'bg-slate-900 text-white' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {period}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="border border-slate-200 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-900">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="justify-start h-auto p-4 border-slate-200 hover:bg-slate-50"
              onClick={() => onNavigateToSection('inventory')}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Package className="h-4 w-4 text-slate-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-900">Fulfillment Center</p>
                  <p className="text-xs text-slate-500">Manage inventory assignments</p>
                </div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="justify-start h-auto p-4 border-slate-200 hover:bg-slate-50"
              onClick={() => onNavigateToSection('requisitions')}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <ClipboardList className="h-4 w-4 text-slate-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-900">Requisitions</p>
                  <p className="text-xs text-slate-500">Review and confirm receipts</p>
                </div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="justify-start h-auto p-4 border-slate-200 hover:bg-slate-50"
              onClick={() => onNavigateToSection('inventory')}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Clock className="h-4 w-4 text-slate-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-900">Pending Orders</p>
                  <p className="text-xs text-slate-500">Review dispatch approvals</p>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
