import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Inventory/components/ui/card";
import { Button } from "@/components/Inventory/components/ui/button";
import { Input } from "@/components/Inventory/components/ui/input";
import { Label } from "@/components/Inventory/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Inventory/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/Inventory/components/ui/table";
import { Badge } from "@/components/Inventory/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/Inventory/components/ui/tabs";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/Inventory/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Inventory/components/ui/popover";
import { Building, Search, Plus, Minus, Package, Check, ChevronsUpDown, RefreshCw, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { cfg } from "@/lib/config";
import { toast } from "sonner";
import { User as UserType } from "@/types/requisition";
import type { FieldRep } from "@/components/Inventory/types/inventory";

interface StockManagementProps {
  currentUser: UserType;
  fieldReps: FieldRep[];
  onAction: (action: string, data: any) => void;
  onRefresh?: () => Promise<void>;
  readOnly?: boolean; // Add this
}

interface StockItem {
  id: string;
  name: string;
  quantity: number;
  location: string;
  repName?: string;
}

export function StockManagement({ currentUser, fieldReps = [], onAction, onRefresh, readOnly = false }: StockManagementProps) {
  const [activeTab, setActiveTab] = useState("view");
  const [allStock, setAllStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false); // Track if data has been loaded at least once
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Adjust Stock Form State
  const [adjustLocation, setAdjustLocation] = useState<string>("Inventory - Main HQ");
  const [adjustRepName, setAdjustRepName] = useState<string>("");
  const [adjustProductId, setAdjustProductId] = useState<string>("");
  const [adjustProductName, setAdjustProductName] = useState<string>("");
  const [adjustQuantity, setAdjustQuantity] = useState<string>("");
  const [adjustAction, setAdjustAction] = useState<"ADD" | "SUBTRACT">("ADD");
  const [adjustReason, setAdjustReason] = useState<string>("");
  const [productsCache, setProductsCache] = useState<Record<string, Array<{id: string, name: string, quantity: number}>>>({});
  const [openCombobox, setOpenCombobox] = useState(false);
  const [productSearchValue, setProductSearchValue] = useState("");

  const locations = [
    { value: "Inventory - Main HQ", label: "Main HQ" },
    { value: "Inventory - Nyamira Branch", label: "Nyamira" }
  ];

  // Get location text color
  const getLocationTextColor = (location: string) => {
    if (location === "Main HQ") {
      return "text-blue-700 font-medium";
    } else if (location === "Nyamira") {
      return "text-red-600 font-medium";
    } else {
      // Field Rep
      return "text-black font-medium";
    }
  };

  // Fetch all stock from all locations
  const fetchAllStock = async (forceRefresh = false) => {
    // Don't fetch if data already exists and not forcing refresh
    if (allStock.length > 0 && !forceRefresh && hasLoadedOnce) {
      return;
    }

    setLoading(true);
    try {
      const stockItems: StockItem[] = [];
      
      // Fetch Main HQ
      const mainHQProducts = await fetchProductsForLocation("Inventory - Main HQ");
      stockItems.push(...mainHQProducts.map(p => ({
        id: p.id,
        name: p.name,
        quantity: p.quantity,
        location: "Main HQ"
      })));
      
      // Fetch Nyamira Branch
      const nyamiraProducts = await fetchProductsForLocation("Inventory - Nyamira Branch");
      stockItems.push(...nyamiraProducts.map(p => ({
        id: p.id,
        name: p.name,
        quantity: p.quantity,
        location: "Nyamira"
      })));
      
      // Fetch Field Reps stock - fetch for each rep
      for (const rep of fieldReps) {
        const repProducts = await fetchProductsForLocation("Inventory - Field Reps", rep.name);
        stockItems.push(...repProducts.map(p => ({
          id: p.id,
          name: p.name,
          quantity: p.quantity,
          location: "Field Rep",
          repName: rep.name
        })));
      }
      
      setAllStock(stockItems);
      setHasLoadedOnce(true); // Mark as loaded
    } catch (error) {
      console.error("Error fetching stock:", error);
      toast.error("Failed to load stock data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch products for a location
  const fetchProductsForLocation = async (locationName: string, repName?: string) => {
    const cacheKey = repName ? `${locationName}-${repName}` : locationName;
    
    if (productsCache[cacheKey]) {
      return productsCache[cacheKey];
    }
    
    try {
      const response = await fetch(cfg.inventoryScript, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'getProductsForLocation',
          data: { locationName, repName: repName || null }
        })
      });
      const result = await response.json();
      
      if (result.status === 'success' && result.products) {
        setProductsCache(prev => ({ ...prev, [cacheKey]: result.products }));
        return result.products;
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
    return [];
  };

  // Fetch data only once on initial mount when fieldReps are available
  useEffect(() => {
    // Only fetch if:
    // 1. Field reps are loaded
    // 2. Data hasn't been loaded yet
    // 3. Stock array is empty
    if (fieldReps.length > 0 && !hasLoadedOnce && allStock.length === 0) {
      fetchAllStock();
    }
  }, [fieldReps]); // Only depend on fieldReps

  // Load products when location changes in adjust form
  useEffect(() => {
    if (adjustLocation) {
      if (adjustLocation === "Inventory - Field Reps") {
        // Don't fetch until rep is selected
        if (adjustRepName) {
          fetchProductsForLocation(adjustLocation, adjustRepName);
        }
      } else {
        fetchProductsForLocation(adjustLocation);
        setAdjustRepName(""); // Clear rep name when switching to non-field rep location
      }
    }
  }, [adjustLocation, adjustRepName]);

  // Filter stock items
  const filteredStock = useMemo(() => {
    let filtered = allStock;
    
    // Filter by location
    if (locationFilter !== "all") {
      if (locationFilter === "Field Rep") {
        filtered = filtered.filter(item => item.location === "Field Rep");
      } else {
        filtered = filtered.filter(item => item.location === locationFilter);
      }
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term) ||
        (item.repName && item.repName.toLowerCase().includes(term))
      );
    }
    
    return filtered.sort((a, b) => {
      // Sort by location first, then by name
      if (a.location !== b.location) {
        return a.location.localeCompare(b.location);
      }
      return a.name.localeCompare(b.name);
    });
  }, [allStock, locationFilter, searchTerm]);

  // Handle stock adjustment
  const handleAdjustStock = async () => {
    if (!adjustProductId || !adjustQuantity || !adjustReason.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // For Field Rep, rep name is required
    if (adjustLocation === "Inventory - Field Reps" && !adjustRepName) {
      toast.error("Please select a Field Rep");
      return;
    }

    const quantity = parseFloat(adjustQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    try {
      const response = await fetch(cfg.inventoryScript, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateStockQuantity',
          data: {
            location: adjustLocation,
            repName: adjustLocation === "Inventory - Field Reps" ? adjustRepName : null,
            productId: adjustProductId,
            actionType: adjustAction,
            quantity: quantity,
            reason: adjustReason,
            userName: currentUser.name
          }
        })
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        toast.success(`Stock ${adjustAction === 'ADD' ? 'added' : 'subtracted'} successfully!`);
        // Reset form
        setAdjustProductId("");
        setAdjustProductName("");
        setAdjustQuantity("");
        setAdjustReason("");
        setAdjustRepName("");
        
        // Refresh stock data after successful adjustment (force refresh)
        await fetchAllStock(true);
        
        if (onRefresh) await onRefresh();
      } else {
        toast.error(result.message || "Failed to adjust stock");
      }
    } catch (error) {
      console.error("Error adjusting stock:", error);
      toast.error("Failed to adjust stock");
    }
  };

  const handleProductSelect = (productId: string, productName: string) => {
    setAdjustProductId(productId);
    setAdjustProductName(productName);
    setOpenCombobox(false);
  };

  const currentLocationProducts = adjustLocation === "Inventory - Field Reps" && adjustRepName
    ? productsCache[`Inventory - Field Reps-${adjustRepName}`] || []
    : productsCache[adjustLocation] || [];

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white border border-slate-200 rounded-xl p-1">
          <TabsTrigger 
            value="view" 
            className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            <Package className="h-4 w-4 mr-2" />
            View Stock
          </TabsTrigger>
          <TabsTrigger 
            value="adjust" 
            className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adjust Stock
          </TabsTrigger>
        </TabsList>

        <TabsContent value="view" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Current Stock Levels</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchAllStock(true)} // Force refresh when button clicked
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by product name, ID, or rep name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 bg-white"
                    />
                  </div>
                </div>
                <div className="w-full md:w-48">
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Filter by location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      <SelectItem value="Main HQ">Main HQ</SelectItem>
                      <SelectItem value="Nyamira">Nyamira</SelectItem>
                      <SelectItem value="Field Rep">Field Rep</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Stock Table */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredStock.length > 0 ? (
                <div className="rounded-xl border bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/60">
                        <TableHead className="font-medium text-gray-700">Product Name</TableHead>
                        <TableHead className="font-medium text-gray-700">Product ID</TableHead>
                        <TableHead className="font-medium text-gray-700">Current Quantity</TableHead>
                        <TableHead className="font-medium text-gray-700">Location</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStock.map((item, index) => {
                        const locationColor = getLocationTextColor(item.location);
                        return (
                          <TableRow 
                            key={`${item.id}-${item.location}-${item.repName || ''}-${index}`} 
                            className="hover:bg-gray-50/60"
                          >
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="font-mono text-sm text-gray-600">{item.id}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                {item.quantity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {item.location === "Field Rep" ? (
                                  <>
                                    <User className="h-4 w-4 text-gray-500" />
                                    <span className={locationColor}>
                                      {item.repName || "Field Rep"}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Building className="h-4 w-4 text-gray-500" />
                                    <span className={locationColor}>
                                      {item.location}
                                    </span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Card className="border-slate-200">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <Package className="h-6 w-6 text-slate-400" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">No stock found</h3>
                    <p className="text-slate-500 text-center">
                      {searchTerm || locationFilter !== "all" 
                        ? "Try adjusting your filters" 
                        : "No inventory items available"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adjust" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Add or Subtract Stock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Location Selector */}
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Select value={adjustLocation} onValueChange={(value) => {
                  setAdjustLocation(value);
                  setAdjustProductId("");
                  setAdjustProductName("");
                }}>
                  <SelectTrigger id="location" className="bg-white">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.value} value={loc.value}>
                        {loc.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="Inventory - Field Reps">Field Rep</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Field Rep Selector (only show if Field Rep location selected) */}
              {adjustLocation === "Inventory - Field Reps" && (
                <div className="space-y-2">
                  <Label htmlFor="rep">Field Rep *</Label>
                  <Select value={adjustRepName} onValueChange={(value) => {
                    setAdjustRepName(value);
                    setAdjustProductId("");
                    setAdjustProductName("");
                  }}>
                    <SelectTrigger id="rep" className="bg-white">
                      <SelectValue placeholder="Select field rep" />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldReps.map(rep => (
                        <SelectItem key={rep.id} value={rep.name}>
                          {rep.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Product Selector */}
              <div className="space-y-2">
                <Label htmlFor="product">Product *</Label>
                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCombobox}
                      className="w-full justify-between bg-white"
                      disabled={adjustLocation === "Inventory - Field Reps" && !adjustRepName}
                    >
                      {adjustProductName || "Search product..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search product..." 
                        value={productSearchValue}
                        onValueChange={setProductSearchValue}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {currentLocationProducts.length === 0 ? "Loading..." : "No products found."}
                        </CommandEmpty>
                        <CommandGroup>
                          {currentLocationProducts
                            .filter(product => 
                              !productSearchValue || 
                              product.name.toLowerCase().includes(productSearchValue.toLowerCase()) ||
                              product.id.toLowerCase().includes(productSearchValue.toLowerCase())
                            )
                            .map((product) => (
                              <CommandItem
                                key={product.id}
                                value={product.id}
                                onSelect={() => handleProductSelect(product.id, product.name)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    adjustProductId === product.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="text-sm">{product.name}</span>
                                  <span className="text-xs text-muted-foreground">ID: {product.id}</span>
                                  <span className="text-xs text-muted-foreground">Qty: {product.quantity}</span>
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Action Type */}
              <div className="space-y-2">
                <Label htmlFor="action">Action *</Label>
                <Select value={adjustAction} onValueChange={(value) => setAdjustAction(value as "ADD" | "SUBTRACT")}>
                  <SelectTrigger id="action" className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADD">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-green-600" />
                        <span>Add Stock</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="SUBTRACT">
                      <div className="flex items-center gap-2">
                        <Minus className="h-4 w-4 text-red-600" />
                        <span>Subtract Stock</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter quantity"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  className="bg-white"
                />
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason/Notes *</Label>
                <Input
                  id="reason"
                  placeholder="e.g., Stock received, Damaged items, etc."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="bg-white"
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleAdjustStock}
                className="w-full"
                disabled={!adjustProductId || !adjustQuantity || !adjustReason.trim() || (adjustLocation === "Inventory - Field Reps" && !adjustRepName) || readOnly}
              >
                {adjustAction === 'ADD' ? (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Stock
                  </>
                ) : (
                  <>
                    <Minus className="h-4 w-4 mr-2" />
                    Subtract Stock
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
