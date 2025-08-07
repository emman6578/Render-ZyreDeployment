// Types for Inventory Batch Creation
export interface InventoryItemInput {
  productId: number;
  initialQuantity: number;
  costPrice: number;
  retailPrice: number;
}

export interface InventoryBatchInput {
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
  items: InventoryItemInput[];
}

export interface CreateInventoryBatchesRequest {
  batches: InventoryBatchInput[];
}

// Response types
export interface CreatedInventoryItem {
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

export interface CreatedInventoryBatch {
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
  items: CreatedInventoryItem[];
  itemsCount: number;
  totalCostValue: number;
  totalRetailValue: number;
}

// Interface for query parameters
export interface InventoryMovementQuery {
  search?: string;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  page?: string;
  limit?: string;
  movementType?: string;
  dateFrom?: string;
  dateTo?: string;
}
