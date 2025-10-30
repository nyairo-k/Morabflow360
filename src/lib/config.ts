export const cfg = {
  apiBase: import.meta.env.VITE_API_BASE as string,
  requisitionsScript: import.meta.env.VITE_REQUISITIONS_SCRIPT as string,
  inventoryScript: import.meta.env.VITE_INVENTORY_SCRIPT as string,
  googleScript: import.meta.env.VITE_GOOGLE_SCRIPT as string,
  crmScript: import.meta.env.VITE_CRM_SCRIPT as string,
  mode: import.meta.env.MODE as 'development' | 'staging' | 'production',
};