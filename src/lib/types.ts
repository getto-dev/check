export type ItemType = 'service' | 'product';
export type ThemeMode = 'light' | 'dark' | 'system';
export type TabType = 'catalog' | 'invoice' | 'manual' | 'settings';
export interface CatalogItem { id:string; name:string; description:string; unit:string; priceKopecks:number; categoryId:string }
export interface InvoiceItem { id:string; catalogId?:string; name:string; description:string; quantity:number; priceKopecks:number; unit:string; type:ItemType; categoryId:string }
export interface Settings { address:string; discount:number; discountPercent:number }
export interface Totals { subtotalServices:number; subtotalProducts:number; discountAmount:number; grandTotal:number; servicesKopecks:number; productsKopecks:number; discountKopecks:number; grandTotalKopecks:number }
export interface EstimateFileV1 { version:1; app:'santeh-schet'; name:string; items:InvoiceItem[]; settings:Settings; savedAt:number }
