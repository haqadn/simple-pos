export type BaseLineItem = {
  product_id: number;
  line_item_id?: number;
  quantity: number;
  name: string;
};

export type LineItem = BaseLineItem & {
  price: number;
  variation_id?: number;
};

export type KotLineItem = BaseLineItem & {
  previousQuantity: number;
};

export type Product = {
  id: number;
  price: number;
  name: string;
  sku: string;
  menu_order?: number;
  categories?: Array<{ id: number }>;
  parent_id?: number;
};
