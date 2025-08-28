import { useState, useEffect, useMemo } from "react";
import { LoginScreen } from "@/components/Auth/LoginScreen";
import { Header } from "@/components/Layout/Header";
import { Sidebar } from "@/components/Layout/Sidebar";
import { SalesDashboard } from "@/components/Dashboard/SalesDashboard";
import { FinanceDashboard } from "@/components/Dashboard/FinanceDashboard";
import { QuotationForm } from "@/components/Sales/QuotationForm";
import { InvoiceRequestForm } from "@/components/Sales/InvoiceRequestForm";
import { QuotationsList } from "@/components/Sales/QuotationsList";
import { InvoicesList } from "@/components/Sales/InvoicesList";
import { PendingInvoices } from "@/components/Finance/PendingInvoices";
import { PaymentStatus } from "@/components/Finance/PaymentStatus";
import { ChangePasswordScreen } from "@/components/Auth/ChangePasswordScreen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CrmPage } from "@/components/Crm/CrmPage";
import { toast } from "sonner";
import RequisitionsPage from "@/components/requisitions/RequisitionsPage";
import { Requisition } from "@/types/requisition";
import { FulfillmentCenter } from "../components/Inventory/components/inventory/FulfillmentCenter";


// Define a type for our user object
interface User {
  name: string;
  role: string;
  forcePasswordChange?: boolean;
}

// Define a type for our Client object
interface Client {
  clientId: string;
  clientName: string;
  contactPerson: string;
  phoneNumber: string;
  email: string;
  region: string;
  assignedSalesRep: string;
}

const Index = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [quotations, setQuotations] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [dispatchOrders, setDispatchOrders] = useState<any[]>([]);

  const fieldReps = [
    { id: "rep1", name: "Cecilia Ndinda" },
    { id: "rep2", name: "Winnie Kiptoo" },
    { id: "rep3", name: "Justin Miruka" },
    { id: "rep4", name: "Makori Kennedy" },
    { id: "rep5", name: "Victor Yego" },
    { id: "rep6", name: "Marion Musimbi" },
    { id: "rep7", name: "Nancy Nyamo" },
  ];


const invoicesForFulfillment = useMemo(() => {
    // Filter for invoices that are ready for dispatch
    const fulfillableInvoices = invoices.filter(inv => inv.status === 'Uploaded');

    // Transform them into the structure that FulfillmentCenter expects
    return fulfillableInvoices.map(inv => {
      // Safely parse the items JSON string
      const lineItems = (typeof inv.items === 'string' && inv.items) ? JSON.parse(inv.items) : [];

      return {
        // Data FulfillmentCenter expects:  // Data from your 'invoices' state:
        invoiceId: inv.id,
        customerName: inv.clientName,
        customerPhone: inv.customerPhone || 'N/A',
        invoiceDate: inv.submittedDate,
        status: 'AWAITING_FULFILLMENT',
        totalAmount: Number(inv.totalAmount),
        lineItems: lineItems.map((item: any, index: number) => ({
          id: `${inv.id}-${index}`, // Create a unique ID for the line item in the UI
          productName: item.productName,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          // Add a default fulfillmentSource
          fulfillmentSource: undefined, 
        }))
      };
    });
  }, [invoices]); 



// REPLACE it with this working version:
  
  const refreshInvoiceData = async () => {
    if (!currentUser) return;
    console.log("Refreshing all invoice and payment data...");
    setIsLoading(true);

    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwO99bRUkNFlufBSSjG6GUn2mSwWi5NjqTLub9emV-jOulzEg69nDxBGycdJDBDCr4d/exec"; 

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL);
      const result = await response.json();
      
      if (result.status === "success") {
        // Deconstruct the new data object from the response
        const { invoices, payments } = result.data;
        
        const sortedInvoices = invoices.sort((a, b) => 
          new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime()
        );

        // Set BOTH state variables with the new data
        setInvoices(sortedInvoices);
        setPayments(payments || []); // Use || [] as a safeguard
        
        toast.success("Invoice & Payment data refreshed!");
      } else {
        toast.error("Failed to refresh invoice data: ".concat(result.message));
      }
    } catch (error) {
      toast.error("Network error while refreshing invoice data.");
    } finally {
      setIsLoading(false);
    }
  };


 const handleLogPayment = (paymentData: any, imageFile: File | null) => {
    // Use a toast.promise for a great user experience
    const promise = new Promise<void>(async (resolve, reject) => {
        let imageUrl = '';

        try {
            // STEP 1: UPLOAD THE IMAGE to the Node.js server if it exists
            if (imageFile) {
                const formData = new FormData();
                formData.append("paymentImage", imageFile);
                formData.append("invoiceId", paymentData.invoiceId);
                
                const uploadResponse = await fetch("http://localhost:4000/upload-payment-image", {
                    method: "POST",
                    body: formData,
                });

                if (!uploadResponse.ok) {
                    const err = await uploadResponse.json();
                    throw new Error(err.message || "Image upload failed");
                }
                const uploadResult = await uploadResponse.json();
                imageUrl = uploadResult.url;
            }

            // STEP 2: LOG THE PAYMENT DETAILS (with the new URL) to the Apps Script
            const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwO99bRUkNFlufBSSjG6GUn2mSwWi5NjqTLub9emV-jOulzEg69nDxBGycdJDBDCr4d/exec"; // Use your main script URL
            const payload = {
                type: "logPayment",
                ...paymentData,
                paymentImageUrl: imageUrl, // Will be the new URL from Step 1, or an empty string
            };

            const logResponse = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });

            const logResult = await logResponse.json();
            if (logResult.status === 'success') {
                resolve(); // Everything succeeded
            } else {
                throw new Error(logResult.message || "Failed to log payment in sheet.");
            }
        } catch (error) {
            reject(error); // If any step failed, reject the promise
        }
    });

    toast.promise(promise, {
        loading: 'Processing payment...',
        success: () => {
            refreshInvoiceData(); // Refresh all data on success
            return 'Payment logged successfully!';
        },
        error: (err) => `Payment Error: ${err.message}`
    });
  };

const refreshRequisitionData = async () => {
    if (!currentUser) return;
    console.log("Fetching all requisition data...");
    // We can use the same isLoading state for all initial data fetches
    setIsLoading(true);

    // !! IMPORTANT !! Use the NEW URL from your dedicated Requisitions Apps Script
    const REQ_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbynj4wHqz6Jzue8jRQXXMsE7S03H3t7SQDkeyn7OwVQyj7nisbaaOj-WOh44NXDT7trcA/exec"; 

    try {
      const response = await fetch(REQ_SCRIPT_URL);
      const result = await response.json();
      
      if (result.status === "success") {
        // Sort the data by most recent first
        const sortedData = result.data.sort((a, b) => 
          new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
        );
        setRequisitions(sortedData);
      } else {
        toast.error("Failed to load requisition data: " + result.message);
      }
    } catch (error) {
      toast.error("Network error while loading requisitions.");
    } finally {
      // We can manage the master isLoading state in a combined useEffect later if needed
      setIsLoading(false);
    }
};

const refreshInventoryData = async () => {
    if (!currentUser) return;
    console.log("Fetching all inventory data...");
    // You can set isLoading here if needed, but the main useEffect handles it.

    // !! IMPORTANT !! This will be the URL of your NEW, dedicated Inventory Apps Script
    const INV_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxXzLPpbTj4SI1fAyuC86vSMPglgbelREePHLCFCsLI8OKNVcaU7YBwfNpABfg3swbbzw/exec"; 

    try {
      const response = await fetch(INV_SCRIPT_URL);
      const result = await response.json();
      
      if (result.status === "success") {
        // Deconstruct the data from the script's response
        const { products, suppliers, purchaseOrders } = result.data;
        setProducts(products || []);
        setSuppliers(suppliers || []);
        setPurchaseOrders(purchaseOrders || []);
        setDispatchOrders(dispatchOrders || []);
      } else {
        toast.error("Failed to load inventory data: " + result.message);
      }
    } catch (error) {
      toast.error("Network error while loading inventory data.");
    }
  };

  // --- ADDITION: Effect to fetch clients ONCE after login ---
  useEffect(() => {
    if (currentUser && clients.length === 0) {
      const fetchInitialData = async () => {
        // !! IMPORTANT !! YOU MUST REPLACE THIS URL WITH YOUR CRM SCRIPT URL
        const CRM_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyVaApUc7-Prj7w5ETFIe8yCtKBoq-bTnvlOksVWAwZWvUkoX__Zg5oFOu2x8uBJYfj/exec"; 
        
        try {
          const response = await fetch(CRM_SCRIPT_URL);
          const result = await response.json();
          if (result.status === "success") {
            setClients(result.data);
          } else {
            toast.error("Failed to load client data: " + result.message);
          }
        } catch (error) {
          toast.error("Network error: Could not load initial client data.");
        } finally {
        }
      };
      fetchInitialData();
    }
  }, [currentUser]);


useEffect(() => {
  if (currentUser) {
    refreshInvoiceData();
    refreshRequisitionData();
    refreshInventoryData();
    // fetchInitialClientData(); 
  }
}, [currentUser]);

  // --- MODIFICATION: Updated login/logout handlers ---
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveSection("dashboard");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setClients([]); // Clear client data on logout
  };

  const handlePasswordChanged = () => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, forcePasswordChange: false });
    }
  };

  // --- ADDITION: Function to update client list from child component ---
  const addClientToState = (newClient: Client) => {
    setClients(prevClients => [...prevClients, newClient]);
  };

// ADD this entire function in the same place where you just deleted the placeholders.
// A good spot is right after `addClientToState`.

  const handleRequisitionAction = (action: string, data: any) => {
    // !! IMPORTANT !! Use the NEW URL from your dedicated Requisitions Apps Script
    const REQ_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbynj4wHqz6Jzue8jRQXXMsE7S03H3t7SQDkeyn7OwVQyj7nisbaaOj-WOh44NXDT7trcA/exec";
    const payload = { 
      action, // e.g., 'create', 'approve', 'pay'
      data    // The data object for that action
    };

    const promise = fetch(REQ_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
    }).then(res => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.message || "Action failed") });
        }
        return res.json();
    });

    toast.promise(promise, {
        loading: 'Processing requisition...',
        success: (result) => {
            if (result.status === 'success') {
                // On any successful action, refresh the master data list
                refreshRequisitionData(); 
                return result.message || 'Action completed successfully!';
            } else {
                // If the script itself reports an error
                throw new Error(result.message);
            }
        },
        error: (err) => `Action Failed: ${err.message}`
    });
  };
  // --- YOUR ORIGINAL, UNTOUCHED HANDLER FUNCTIONS ---
  const handleQuotationSubmit = async (quotation: any) => {
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw2g10nBTAiV1JUFpJ6unq-8XENrW_Fxk2QU_cez-HGlkWmFKynRmfXQA-mIrFm2NKu/exec"; 
    const payload = {
      type: "quotation",
      quoteId: quotation.id,
      clientName: quotation.clientName,
      items: quotation.items,
      totalAmount: quotation.totalAmount
    };
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST', mode: 'cors', cache: 'no-cache',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.status === "success" && result.pdfUrl) {
        console.log("PDF created successfully! URL:", result.pdfUrl);
        const newQuotationForState = { ...quotation, pdfUrl: result.pdfUrl, docUrl: result.docUrl };
        setQuotations(prev => [...prev, newQuotationForState]);
      } else {
        alert("Could not generate PDF: " + result.message);
        setQuotations(prev => [...prev, quotation]);
      }
    } catch (error) {
      console.error('Error during PDF generation:', error);
      alert("A network error occurred while generating the PDF.");
    }
  };

  const handleInvoiceSubmit = (invoice: any) => {
    setInvoices(prev => [...prev, invoice]);
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwO99bRUkNFlufBSSjG6GUn2mSwWi5NjqTLub9emV-jOulzEg69nDxBGycdJDBDCr4d/exec";
    const payload = {
      type: "invoiceRequest",
      clientName: invoice.clientName,
      customerPhone: invoice.customerPhone,
      items: invoice.items,
      id: invoice.id, 
      totalAmount: invoice.totalAmount
    };
    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === "success") { console.log("Backend direct invoice request successful."); }
      else { console.error("Backend direct invoice request failed:", data.message); }
    })
    .catch(error => console.error("Network error on direct invoice request:", error));
  };

  const handleQuotationApprove = (id: string) => {
    const approvedQuoteData = quotations.find(q => q.id === id);

    if (!approvedQuoteData) {
      toast.error("Logic Error: Could not find the quote to approve.");
      return;
    }

    // This creates the unique ID on the frontend, which is correct.
    const newInvoiceId = `INV-${Date.now()}`;
    
     const invoiceForUi = {
        id: newInvoiceId,
        quoteId: id,
        clientName: approvedQuoteData.clientName,
        customerPhone: approvedQuoteData.customerPhone, // <-- ADD THIS LINE
        items: approvedQuoteData.items,
        totalAmount: approvedQuoteData.totalAmount,
        status: "Waiting",
        submittedBy: approvedQuoteData.submittedBy,
        submittedDate: new Date().toISOString(),
        paymentStatus: "Unpaid"
    };
    setInvoices(prev => [...prev, invoiceForUi]);

    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzleToSqw6zAX25KWZ0UnLE4lmiIe2UMNgNAqoFQACx4kwYTSTF9fGx-JgjEG6mk0Ah/exec";
    
    const payload = {
      type: "updateQuoteStatus",
      quoteId: id,
      customerPhone: approvedQuoteData.customerPhone,
      newStatus: "Approved",
      newInvoiceId: newInvoiceId // We send the new ID to the backend
    };

    // Use a toast.promise for better UX, just like the uploader
    const promise = fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(res => res.json());

    toast.promise(promise, {
      loading: 'Approving quote and creating invoice...',
      success: (data) => {
        if (data.status === "success") {
          // THIS IS THE KEY: After the backend confirms success, we refresh ALL data.
          refreshInvoiceData();
          // You might also want to refresh quotation data here if its status changes
          // refreshQuotationData(); 
          return "Invoice created successfully!";
        } else {
          throw new Error(data.message);
        }
      },
      error: (err) => `Error: ${err.message}`,
    });
  };

  // --- Main Rendering Logic ---
   if (!currentUser) { return <LoginScreen onLogin={handleLogin} />; }
  if (currentUser.forcePasswordChange) { return <ChangePasswordScreen username={currentUser.name} onPasswordChanged={handlePasswordChanged} />; }

const handleInventoryAction = (action: string, data: any) => {
    const INV_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxCMARGZN9qJvu1TqOsjQaXgxbm4CYjNPd6DE-hKbLWClPKqWvqJRQNFMoLfemYWu3hlQ/exec";
    const payload = { action, data };

    const promise = fetch(INV_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(res => res.json());

    toast.promise(promise, {
      loading: 'Processing inventory action...',
      success: (result) => {
        if (result.status === 'success') {
          // Refresh both inventory and invoice data on success, as they are linked
          refreshInventoryData();
          refreshInvoiceData();
          return result.message || 'Action completed successfully!';
        } else {
          throw new Error(result.message);
        }
      },
      error: (err) => `Inventory Action Failed: ${err.message}`
    });
  };



const renderContent = () => {
    const userRole = currentUser.role;

    // Show a loading spinner while fetching initial data
    if (isLoading) {
      return <div className="p-6 font-medium text-muted-foreground">Loading dashboard data...</div>;
    }

    if (userRole === "Sales") {
      switch (activeSection) {
        case "dashboard": return <SalesDashboard quotations={quotations} invoices={invoices} />;
        case "sales-quotes": return (<div className="space-y-6"><QuotationForm onSubmit={handleQuotationSubmit} /><QuotationsList quotations={quotations} onApprove={handleQuotationApprove} /></div>);
        case "sales-invoices": 
  return (<div className="space-y-6">
    <InvoiceRequestForm onSubmit={handleInvoiceSubmit} />
    <InvoicesList 
      invoices={invoices} 
      payments={payments}
      onLogPayment={handleLogPayment}
      currentUser={currentUser}
    />
  </div>);
        case "crm": return <CrmPage currentUser={currentUser} clients={clients} onClientAdded={addClientToState} />;
        case "requisitions":
  return (
    <RequisitionsPage
      currentUser={currentUser}
      requisitions={requisitions}
      // Pass the single, powerful handler function for all actions
      onAction={handleRequisitionAction}
      onRefresh={refreshRequisitionData}
    />
  );
        default: return <SalesDashboard quotations={quotations} invoices={invoices} />;
      }
    } 
    
    else if (userRole === "Finance") {
      switch (activeSection) {
       case "dashboard": return <FinanceDashboard invoices={invoices} />;
      case "finance-pending": 
  return <PendingInvoices invoices={invoices} payments={payments} onUploadSuccess={refreshInvoiceData} />;
       case "sales-invoices": 
      return (
        <InvoicesList 
          invoices={invoices} 
          payments={payments}
          onLogPayment={handleLogPayment}
          currentUser={currentUser}
        />
      );

       case "requisitions":
 return (
    <RequisitionsPage
      currentUser={currentUser}
      requisitions={requisitions}
      // Pass the single, powerful handler function for all actions
      onAction={handleRequisitionAction}
      onRefresh={refreshRequisitionData}
    />
  );
        default: return <FinanceDashboard invoices={invoices} />;
      }
    }
    
    else if (userRole === "Admin") {
        switch(activeSection) {
            case "dashboard": return <div><SalesDashboard quotations={quotations} invoices={invoices} /><FinanceDashboard invoices={invoices} /></div>;
            case "crm": return <CrmPage currentUser={currentUser} clients={clients} onClientAdded={addClientToState} />;
            case "sales-quotes": return (<div className="space-y-6"><QuotationForm onSubmit={handleQuotationSubmit} /><QuotationsList quotations={quotations} onApprove={handleQuotationApprove} /></div>);
            case "sales-invoices": 
          return (<div className="space-y-6">
            <InvoiceRequestForm onSubmit={handleInvoiceSubmit} />
            <InvoicesList 
              invoices={invoices} 
              payments={payments}
              onLogPayment={handleLogPayment}
              currentUser={currentUser}
            />
          </div>);
          case "finance-pending": 
  return <PendingInvoices invoices={invoices} payments={payments} onUploadSuccess={refreshInvoiceData} />;
            case "finance-payments": return <PaymentStatus invoices={invoices} onUpdatePaymentStatus={handleUpdatePaymentStatus} />;
            case "requisitions":
  return (
    <RequisitionsPage
      currentUser={currentUser}
      requisitions={requisitions}
      // Pass the single, powerful handler function for all actions
      onAction={handleRequisitionAction}
      onRefresh={refreshRequisitionData}
    />
  );
         case "inventory":
  return (
    <FulfillmentCenter 
      currentUser={currentUser}
      invoices={invoicesForFulfillment} // <-- This is the new, correctly formatted data
      suppliers={suppliers}
      fieldReps={fieldReps}
      purchaseOrders={purchaseOrders}
      dispatchOrders={dispatchOrders}
      onAction={handleInventoryAction}
    />
  );
            case "reports": return <Card><CardHeader><CardTitle>Management Reports</CardTitle></CardHeader><CardContent>Reports module component will be built here.</CardContent></Card>;
            default: return <div>Admin Dashboard</div>;
        }
    }

// --- NEW: RENDER LOGIC FOR INVENTORY ROLE ---
    else if (userRole === "InventoryStaff") { // Assuming "InventoryStaff" is the role name
        switch(activeSection) {
            case "dashboard": return <Card><CardHeader><CardTitle>Inventory Dashboard</CardTitle></CardHeader><CardContent>Dashboard for Inventory Staff will be built here.</CardContent></Card>;
           case "inventory":
  return (
    <FulfillmentCenter 
      currentUser={currentUser}
      invoices={invoicesForFulfillment} // <-- This is the new, correctly formatted data
      suppliers={suppliers}
      fieldReps={fieldReps}
      purchaseOrders={purchaseOrders}
      dispatchOrders={dispatchOrders}
      onAction={handleInventoryAction}
    />
  );
            case "requisitions":
  return (
    <RequisitionsPage
      currentUser={currentUser}
      requisitions={requisitions}
      // Pass the single, powerful handler function for all actions
      onAction={handleRequisitionAction}
      onRefresh={refreshRequisitionData}
    />
  );
            default: return <Card><CardHeader><CardTitle>Inventory Dashboard</CardTitle></CardHeader><CardContent>Dashboard for Inventory Staff will be built here.</CardContent></Card>;
        }
    }
    
    // --- NEW: RENDER LOGIC FOR DISBURSEMENTS ROLE ---
    else if (userRole === "Disbursements") {
        switch(activeSection) {
            case "dashboard": return <Card><CardHeader><CardTitle>Disbursements Dashboard</CardTitle></CardHeader><CardContent>Dashboard for Disbursements will be built here.</CardContent></Card>;
            case "requisitions":
 return (
    <RequisitionsPage
      currentUser={currentUser}
      requisitions={requisitions}
      // Pass the single, powerful handler function for all actions
      onAction={handleRequisitionAction}
      onRefresh={refreshRequisitionData}
    />
  );

            case "inventory":
  return (
    <FulfillmentCenter 
      currentUser={currentUser}
      invoices={invoicesForFulfillment} // <-- This is the new, correctly formatted data
      suppliers={suppliers}
      fieldReps={fieldReps}
      purchaseOrders={purchaseOrders}
      dispatchOrders={dispatchOrders}
      onAction={handleInventoryAction}
    />
  );

            default: return <Card><CardHeader><CardTitle>Disbursements Dashboard</CardTitle></CardHeader><CardContent>Dashboard for Disbursements will be built here.</CardContent></Card>;
        }
    }

  }; // End of renderContent function

  return (
    <div className="min-h-screen bg-background">
      <Header currentUser={currentUser} onLogout={handleLogout} />
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection} 
          userRole={currentUser.role}
        />
        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}; // This is the closing brace for the Index component

export default Index;