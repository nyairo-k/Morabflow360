import { 
  FileText, 
  Receipt, 
  Package, 
  BarChart3, 
  Home,
  Users,
  Warehouse,
  ClipboardList,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  userRole: string;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ 
  activeSection, 
  onSectionChange, 
  userRole, 
  isMobile = false, 
  isOpen = false, 
  onClose 
}: SidebarProps) {
   // This new constant defines all modules in the application and their access rules
  const allModules = [
    { id: "dashboard", label: "Dashboard", icon: Home, roles: ["Sales", "Finance", "Admin", "InventoryStaff", "Disbursements"] },
    
    { id: "crm", label: "CRM", icon: Users, roles: ["Sales", "Admin"] },
    { id: "sales-quotes", label: "Quotations", icon: FileText, roles: ["Sales", "Admin", "InventoryStaff", "Disbursements"] },
    { id: "sales-invoices", label: "Invoice Requests", icon: Receipt, roles: ["Sales", "Admin", "InventoryStaff", "Disbursements"] },
    
    // MODIFIED: Replaced 'Inventory' with 'InventoryStaff' for clarity and added 'Disbursements'
    { id: "requisitions", label: "Requisitions", icon: ClipboardList, roles: ["Sales", "Finance", "Admin", "InventoryStaff", "Disbursements"] },
    
    // MODIFIED: Replaced 'Inventory' with 'InventoryStaff'
    { id: "inventory", label: "Inventory", icon: Warehouse, roles: ["InventoryStaff", "Admin", "Disbursements", "Sales", "Finance"] },

    { id: "accounts-payables", label: "Accounts Payables", icon: BarChart3, roles: ["Finance", "Admin"] },
    { id: "finance-pending", label: "Pending Invoices", icon: Receipt, roles: ["Finance", "Admin"] },
    { id: "reports", label: "Reports", icon: BarChart3, roles: ["Admin"] },
  ];

  // This line now dynamically filters all possible modules based on the current user's role.
  const accessibleModules = allModules.filter(module => module.roles.includes(userRole));

  const handleSectionChange = (section: string) => {
    onSectionChange(section);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const sidebarContent = (
    <>
      <div className="p-4 md:p-6 border-b border-nav-accent/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-1">{userRole} Portal</h2>
            <p className="text-sm text-nav-foreground/70">Morab Group ERP</p>
          </div>
          {isMobile && onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="md:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4">
        <div className="space-y-2 mb-8">
          {/* We now map over the dynamically filtered list of accessible modules */}
          {accessibleModules.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSectionChange(item.id)}
              className={cn(
                "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors",
                activeSection === item.id
                  ? "bg-nav-accent text-white"
                  : "hover:bg-nav-foreground/10 text-nav-foreground/90"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm md:text-base">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );

  if (isMobile) {
    return (
      <div className={cn(
        "fixed inset-0 z-50 bg-black/50 transition-opacity",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <div className={cn(
          "fixed left-0 top-0 h-full w-64 bg-nav-background text-nav-foreground transform transition-transform",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          {sidebarContent}
        </div>
      </div>
    );
  }

  return (
    <aside className="w-64 bg-nav-background text-nav-foreground h-full flex flex-col">
      {sidebarContent}
    </aside>
  );
}