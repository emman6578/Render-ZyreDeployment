export interface PurchaseItemInput {
  productId: number;
  initialQuantity: number;
  costPrice: number;
  retailPrice: number;
}

export interface PurchaseBatchInput {
  batchNumber: string;
  supplierId: number;
  districtId: number;
  dt?: string; // Document type
  invoiceNumber?: string; // Document number
  invoiceDate: string | Date;
  expiryDate: string | Date;
  manufacturingDate?: string | Date;
  receivedBy?: string;
  verifiedBy?: string;
  verificationDate?: string | Date;
  items: PurchaseItemInput[];
}

export interface CreatePurchaseBatchesRequest {
  batches: PurchaseBatchInput[];
}

// Response types
export interface CreatedPurchaseItem {
  id: number;
  productId: number;
  initialQuantity: number;
  currentQuantity: number;
  costPrice: number;
  retailPrice: number;
  status: string;
  product: {
    id: number;
    generic: {
      name: string;
    };
    brand: {
      name: string;
    };
    company: {
      name: string;
    };
  };
}

export interface CreatedPurchaseBatch {
  id: number;
  batchNumber: string;
  invoiceDate: Date;
  expiryDate: Date;
  manufacturingDate?: Date;
  status: string;
  supplier: {
    id: number;
    name: string;
  };
  district: {
    id: number;
    name: string;
  };
  items: CreatedPurchaseItem[];
  itemsCount: number;
  totalCostValue: number;
  totalRetailValue: number;
}

// types/purchaseReturn.types.ts

export interface CreatePurchaseReturnRequest {
  originalPurchaseId: number;
  originalPurchaseItemId: number;
  returnQuantity: number;
  returnReason: string;
  notes?: string;
  approvedById?: number;
  referenceNumber: string;
}

export interface CreatedPurchaseReturn {
  id: number;
  returnQuantity: number;
  returnPrice: number;
  returnReason: string;
  status: string;
  returnDate: Date | null;
  notes: string | null;
  refundAmount: number | null;
  originalPurchase: {
    id: number;
    batchNumber: string;
    invoiceNumber: string;
    supplier: string;
    district: string;
  };
  product: {
    id: number;
    generic: string;
    brand: string;
    company: string;
  };
  updatedQuantity: {
    previousQuantity: number;
    newQuantity: number;
    quantityReduced: number;
  };
  processedBy: {
    id: number;
    fullname: string;
    email: string;
  };
  approvedBy: {
    id: number;
    fullname: string;
    email: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  inventorySync?: {
    wasUpdated: boolean;
    details: any;
  };
}

export interface PurchaseEditQuery {
  page?: string;
  limit?: string;
  search?: string;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}
