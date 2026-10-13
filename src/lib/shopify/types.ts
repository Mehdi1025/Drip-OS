export interface ShopifyLineItemProperty {
  name: string;
  value: string | null;
}

export interface ShopifyLineItem {
  id: number;
  admin_graphql_api_id?: string;
  title: string;
  quantity: number;
  sku: string | null;
  variant_title: string | null;
  product_id: number | null;
  /** Present when Shopify sends expanded product on webhook (optional). */
  product_type?: string | null;
  properties?: ShopifyLineItemProperty[];
}

export interface ShopifyShippingLine {
  title: string | null;
  code: string | null;
}

export interface ShopifyCustomer {
  first_name: string | null;
  last_name: string | null;
}

export interface ShopifyAddress {
  name: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface ShopifyOrderWebhookPayload {
  id: number;
  admin_graphql_api_id?: string;
  name: string;
  order_number?: number;
  customer: ShopifyCustomer | null;
  shipping_address: ShopifyAddress | null;
  shipping_lines: ShopifyShippingLine[];
  line_items: ShopifyLineItem[];
}
