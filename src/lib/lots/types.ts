export type LotDetailSkin = {
  id: string;
  design_name: string;
  track_code: string;
  status: string;
  alert: string | null;
  reprint_of: string | null;
  customer_name: string;
  id_shopify: number;
};

export type LotDetailSheet = {
  id: string;
  sheetCode: string;
  sheetIndex: number;
  fileStatus: "attente_fichier" | "planche_prete" | "imprimee";
  filePath: string | null;
  pngPath: string | null;
  fileUploadedAt: string | null;
  slots: (LotDetailSkin | null)[];
};

export type LotDetailData = {
  lotId: string;
  createdAt: string;
  locked: boolean;
  exportVersion: number;
  exportedAt: string | null;
  sheets: LotDetailSheet[];
};

export type LotAwaitingFileRow = {
  lotId: string;
  createdAt: string;
  missingSheets: number;
  totalSheets: number;
  ageHours: number;
};
