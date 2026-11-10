/** Promesse client affichée (heures calendaires). */
export const PROMISE_HOURS = 48;

/** Fenêtre « à risque » avant échéance (heures). */
export const RISK_HOURS = 12;

/** Commande pending sans imposition au-delà de (h). */
export const PENDING_IMPOSE_SLA_HOURS = 24;

/** Feuille sans PDF au-delà de (h) après imposition. */
export const MISSING_PLANCHE_HOURS = 12;

/** Colis sans nouvelles suivi après expédition (jours ouvrés — approximation jours). */
export const STALE_TRACKING_BUSINESS_DAYS = 7;

/** Livraison inconnue si > N jours après expédition. */
export const UNKNOWN_DELIVERY_DAYS = 15;

/** Minimum colis pour recommander un transporteur par pays. */
export const CARRIER_RECOMMEND_MIN_PARCELS = 10;

/** Fuseau affichage. */
export const DISPLAY_TIMEZONE = "Europe/Paris";
