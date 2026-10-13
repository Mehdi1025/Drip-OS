export type WorkshopSkin = {
  id: string;
  design_name: string;
  track_code: string;
  status: string;
  slot: number | null;
  customer_name: string;
};

export type WorkshopSheet = {
  id: string;
  sheetIndex: number;
  status: string;
  slots: (WorkshopSkin | null)[];
};

export type WorkshopLotData = {
  lotId: string;
  sheets: WorkshopSheet[];
};
