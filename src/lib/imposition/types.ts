export type PendingSkin = {
  id: string;
  design_name: string;
  track_code: string;
  order_id: string;
  customer_name: string;
  id_shopify: number;
};

export type SheetPackPreview = {
  sheetNumber: number;
  skins: (PendingSkin | null)[];
};
