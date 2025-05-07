import { z } from "zod";
import { API } from "./api";

const ProductCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  parent: z.number(),
  description: z.string(),
  menu_order: z.number(),
  count: z.number(),
});

export type ProductCategorySchema = z.infer<typeof ProductCategorySchema>;

const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  sku: z.string(),
  price: z.number(),
  regular_price: z.number(),
  sale_price: z.number(),
  description: z.string(),
  categories: z.array(ProductCategorySchema.pick({ id: true, name: true, slug: true })),
  variations: z.array(z.number()),
});

export type ProductSchema = z.infer<typeof ProductSchema>;

export default class ProductsAPI extends API {
  static async getCategories() {
    const response = await this.client.get("/products/categories", {
      params: { per_page: "100" },
    });

    return ProductCategorySchema.array().parse(response.data);
  }

  static async getProducts(params: Record<string, string | number> = {}) {
    const response = await this.client.get("/products", {
      params: {
        per_page: "100",
        status: "publish",
        orderby: "popularity",
        ...params,
      },
    });

    return ProductSchema.array().parse(response.data);
  }

  static async getVariations(productId: number) {
    const response = await this.client.get(`/products/${productId}/variations`, {
      params: {
        per_page: "100",
        status: "publish",
      },
    });

    return ProductSchema.array().parse(response.data);
  }

  static async updateProduct(productId: ProductSchema['id'], data: Partial<ProductSchema>) {
    return await this.client.put(`/products/${productId}`, data);
  }
}
