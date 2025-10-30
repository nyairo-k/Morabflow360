import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Users, PlusCircle, Loader2, Search, Building, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { cfg } from "@/lib/config";

// Define the types for the props this component now receives
interface Client {
  clientId: string;
  clientName: string;
  contactPerson: string;
  phoneNumber: string;
  email: string;
  region: string;
  assignedSalesRep: string;
}

// --- MODIFICATION 1: The 'isLoading' prop is removed from the interface ---
interface CrmPageProps {
  currentUser: { name: string; role: string; };
  clients: Client[];
  onClientAdded: (newClient: Client) => void;
}

// --- MODIFICATION 2: The 'isLoading' prop is removed from the function signature ---
export function CrmPage({ currentUser, clients, onClientAdded }: CrmPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [showMyClients, setShowMyClients] = useState(false);

  // Filtering logic with the robust safety check
  const filteredClients = useMemo(() => {
    // This safety check is essential. If clients is not an array, return an empty one.
    if (!Array.isArray(clients)) return [];
    
    return clients
      .filter(client => client && client.clientName && client.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(client => regionFilter === "all" || client.region === regionFilter)
      .filter(client => !showMyClients || client.assignedSalesRep === currentUser.name);
  }, [clients, searchTerm, regionFilter, showMyClients, currentUser.name]);

  // Dynamic data calculation with a safety check
  const totalClients = Array.isArray(clients) ? clients.length : 0;
  const myClientsCount = Array.isArray(clients) ? clients.filter(c => c.assignedSalesRep === currentUser.name).length : 0;
  const allRegions = Array.isArray(clients) ? [...new Set(clients.map(c => c.region).filter(Boolean))] : 0;

  // --- MODIFICATION 3: The loading check is now based on the existence of the 'clients' prop ---
  // This is the most robust way to handle the initial loading state.
  if (!clients) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /><p className="ml-4">Loading Client Data...</p></div>;
  }

  // The rest of your JSX and component logic is UNCHANGED.
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Client Management</h1>
        <AddNewClientDialog currentUser={currentUser} onClientAdded={onClientAdded} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-blue-50 border border-blue-200"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Clients</CardTitle><Users className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-blue-900">{totalClients}</div></CardContent></Card>
        <Card className="bg-green-50 border border-green-200"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">My Assigned Clients</CardTitle><UserCheck className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-900">{myClientsCount}</div></CardContent></Card>
        <Card className="bg-amber-50 border border-amber-200"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Regions</CardTitle><Building className="h-4 w-4 text-amber-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-amber-900">{allRegions.length}</div></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Client Directory</CardTitle><CardDescription>A complete list of all registered clients.</CardDescription></CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
            <div className="relative w-full md:w-1/3"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by client name..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            <Select value={regionFilter} onValueChange={setRegionFilter}><SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Filter by region" /></SelectTrigger><SelectContent><SelectItem value="all">All Regions</SelectItem>{allRegions.map(region => <SelectItem key={region} value={region}>{region}</SelectItem>)}</SelectContent></Select>
            <div className="flex items-center space-x-2 ml-auto"><Label htmlFor="my-clients-switch">Show Only My Clients</Label><Switch id="my-clients-switch" checked={showMyClients} onCheckedChange={setShowMyClients} /></div>
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader><TableRow><TableHead>Client Name</TableHead><TableHead>Contact Person</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Region</TableHead><TableHead>Assigned Rep</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredClients.length > 0 ? (filteredClients.map(client => (<TableRow key={client.clientId}><TableCell className="font-medium">{client.clientName}</TableCell><TableCell>{client.contactPerson}</TableCell><TableCell>{client.phoneNumber}</TableCell><TableCell>{client.email}</TableCell><TableCell>{client.region}</TableCell><TableCell>{client.assignedSalesRep}</TableCell></TableRow>))) : (<TableRow><TableCell colSpan={6} className="h-24 text-center">No clients found.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// The Add New Client Dialog (UNCHANGED)
interface AddNewClientDialogProps {
  currentUser: { name: string; role: string; };
  onClientAdded: (newClient: Client) => void;
}

function AddNewClientDialog({ currentUser, onClientAdded }: AddNewClientDialogProps) {
    const [clientName, setClientName] = useState("");
    const [contactPerson, setContactPerson] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [email, setEmail] = useState("");
    const [region, setRegion] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const CRM_SCRIPT_URL = cfg.crmScript; // from env

        try {
            const response = await fetch(CRM_SCRIPT_URL, {
                method: 'POST', mode: 'cors',
                body: JSON.stringify({
                    clientName, contactPerson, phoneNumber, email, region,
                    assignedSalesRepName: currentUser.name,
                    assignedSalesRepUsername: currentUser.name 
                })
            });
            const result = await response.json();
            if (result.status === "success") {
                toast.success("Client added successfully!");
                onClientAdded({
                    clientId: result.newClientId,
                    clientName, contactPerson, phoneNumber, email, region,
                    assignedSalesRep: currentUser.name
                });
                setClientName(""); setContactPerson(""); setPhoneNumber(""); setEmail(""); setRegion("");
                setIsDialogOpen(false);
            } else {
                toast.error("Failed to add client: " + result.message);
            }
        } catch (error) {
            toast.error("Network error adding client.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" /> Add New Client</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Create a New Client Record</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {/* ... form inputs are unchanged ... */}
                    <div className="space-y-2"><Label htmlFor="clientName">Client Name *</Label><Input id="clientName" value={clientName} onChange={e => setClientName(e.target.value)} required /></div>
                    <div className="space-y-2"><Label htmlFor="contactPerson">Contact Person</Label><Input id="contactPerson" value={contactPerson} onChange={e => setContactPerson(e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="phoneNumber">Phone Number</Label><Input id="phoneNumber" type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" pattern="[0-9]{10}" maxLength={10} /></div>
                    <div className="space-y-2"><Label htmlFor="email">Email Address</Label><Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="region">Region</Label><Input id="region" value={region} onChange={e => setRegion(e.target.value)} /></div>
                    <DialogFooter>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Client
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}