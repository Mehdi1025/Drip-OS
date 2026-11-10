export type PendingSkin = {
  id: string;
  design_name: string;
  track_code: string;
  reprint_of: string | null;
  order_id: string;
  customer_name: string;
  id_shopify: number;
  urgent?: boolean;
};

export type SheetPackPreview = {
  sheetNumber: number;
  skins: (PendingSkin | null)[];
};
