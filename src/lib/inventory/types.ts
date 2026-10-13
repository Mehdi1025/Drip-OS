export type InventoryItem = {
  id: string;
  item_name: string;
  current_quantity: number;
  unit: string;
  alert_threshold: number;
  usage_per_sheet: number;
  supplier_url: string | null;
};

export type LotConsumptionContext = {
  sheetCount: number;
  distinctOrderCount: number;
};

export type InventoryDeduction = {
  item: InventoryItem;
  consumed: number;
  previousQuantity: number;
  newQuantity: number;
  belowThreshold: boolean;
};
