import { 
  FileText, 
  Receipt, 
  Package, 
  BarChart3, 
  Home,
  Users,
  Warehouse,
  ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  userRole: string;
}

export function Sidebar({ activeSection, onSectionChange, userRole }: SidebarProps) {
   // This new constant defines all modules in the application and their access rules
  const allModules = [
    { id: "dashboard", label: "Dashboard", icon: Home, roles: ["Sales", "Finance", "Admin", "InventoryStaff", "Disbursements"] },
    
    { id: "crm", label: "CRM", icon: Users, roles: ["Sales", "Admin"] },
    { id: "sales-quotes", label: "Quotations", icon: FileText, roles: ["Sales", "Admin"] },
    { id: "sales-invoices", label: "Invoice Requests", icon: Receipt, roles: ["Sales", "Admin"] },
    
    // MODIFIED: Replaced 'Inventory' with 'InventoryStaff' for clarity and added 'Disbursements'
    { id: "requisitions", label: "Requisitions", icon: ClipboardList, roles: ["Sales", "Finance", "Admin", "InventoryStaff", "Disbursements"] },
    
    // MODIFIED: Replaced 'Inventory' with 'InventoryStaff'
    { id: "inventory", label: "Inventory", icon: Warehouse, roles: ["InventoryStaff", "Admin", "Disbursements"] },

    { id: "finance-pending", label: "Pending Invoices", icon: Receipt, roles: ["Finance", "Admin"] },
    { id: "finance-payments", label: "Payment Status", icon: BarChart3, roles: ["Finance", "Admin"] },
    { id: "reports", label: "Reports", icon: BarChart3, roles: ["Admin"] },
  ];

  // This line now dynamically filters all possible modules based on the current user's role.
  const accessibleModules = allModules.filter(module => module.roles.includes(userRole));

  return (
    <aside className="w-64 bg-nav-background text-nav-foreground h-full flex flex-col">
      <div className="p-6 border-b border-nav-accent/20">
        <h2 className="text-lg font-semibold mb-1">{userRole} Portal</h2>
        <p className="text-sm text-nav-foreground/70">Morab Group ERP</p>
      </div>

      <nav className="flex-1 p-4">
        <div className="space-y-2 mb-8">
          {/* We now map over the dynamically filtered list of accessible modules */}
          {accessibleModules.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors",
                activeSection === item.id
                  ? "bg-nav-accent text-white"
                  : "hover:bg-nav-foreground/10 text-nav-foreground/90"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* The "Future Modules" section has been completely removed. */}
      </nav>
    </aside>
  );
}