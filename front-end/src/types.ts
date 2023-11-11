export type LineItem = {
  product_id: number;
  line_item_id?: number;
  quantity: number;
  price: number;
  name: string;
};

export type Product = {
  id: number;
  price: number;
  name: string;
  sku: string;
  menu_order?: number;
  categories?: Array<{ id: number }>;
};
