import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  currentUser: {
    name: string;
    role: string;
  };
  onLogout: () => void;
}

export function Header({ currentUser, onLogout }: HeaderProps) {
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">MG</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Morab Group ERP</h1>
            <p className="text-xs text-muted-foreground">Medical Equipment & Production</p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-destructive">
            3
          </Badge>
        </Button>
        
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{currentUser.name}</p>
            <p className="text-xs text-muted-foreground">{currentUser.role}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <User className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}