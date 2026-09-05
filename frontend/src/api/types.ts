export type Role = 'ADMIN' | 'ENCARGADO' | 'CAPTURISTA';
export type StorageArea = 'REFRIGERADOR' | 'ALMACEN';
export type CountStatus = 'OPEN' | 'FINALIZED';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  canCorrectClosedCounts: boolean;
}

export interface BranchSummary {
  id: string;
  name: string;
  code: string;
}

export interface Branch extends BranchSummary {
  isActive: boolean;
  operationalCloseHour: string;
  timezone: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  presentation: string | null;
  storageArea: StorageArea;
  displayOrder: number;
  isActive: boolean;
  branchAssignments?: { branchId: string; isActive: boolean; branch?: BranchSummary }[];
}

export interface CountItem {
  id: string;
  countId: string;
  productId: string;
  opening: string | null;
  entries: string | null;
  closing: string | null;
  product: Product;
  lastEditedById: string | null;
  updatedAt: string;
}

export interface Count {
  id: string;
  branchId: string;
  operationalDate: string;
  status: CountStatus;
  createdById: string;
  createdAt: string;
  finalizedById: string | null;
  finalizedAt: string | null;
  items: CountItem[];
  progress: { completed: number; total: number };
  branch?: Branch;
  createdBy?: { id: string; name: string; email: string };
  finalizedBy?: { id: string; name: string; email: string } | null;
}

export interface CountAudit {
  id: string;
  countItemId: string;
  field: 'OPENING' | 'ENTRIES' | 'CLOSING';
  previousValue: string | null;
  newValue: string;
  reason: string;
  modifiedById: string;
  modifiedAt: string;
  modifiedBy: { id: string; name: string; email: string };
  countItem: { product: Product };
}

export interface CountDetail extends Count {
  auditLog: CountAudit[];
}

export interface MissingItem {
  productId: string;
  productName: string;
  missingOpening: boolean;
  missingEntries: boolean;
  missingClosing: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  canCorrectClosedCounts: boolean;
  branchAccess: { branch: BranchSummary }[];
}
