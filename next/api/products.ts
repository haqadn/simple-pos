import { z } from "zod";
import { API } from "./api";

export const ProductCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  parent: z.number(),
  description: z.string(),
  menu_order: z.number(),
  count: z.number(),
});

export type ProductCategorySchema = z.infer<typeof ProductCategorySchema>;

export const ServerSideProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  sku: z.string(),
  price: z.string().transform((val) => val ? parseFloat(val) : 0),
  regular_price: z.string().transform((val) => val ? parseFloat(val) : 0),
  sale_price: z.string().transform((val) => val ? parseFloat(val) : 0),
  description: z.string(),
  categories: z.array(ProductCategorySchema.pick({ id: true, name: true })),
  variations: z.array(z.number()).optional(),
  // Stock fields
  stock_status: z.enum(['instock', 'outofstock', 'onbackorder']).default('instock'),
  stock_quantity: z.number().nullable().default(null),
  manage_stock: z.boolean().default(false),
  low_stock_amount: z.number().nullable().default(null),
});

export type ServerSideProductSchema = z.infer<typeof ServerSideProductSchema>;

export const ServerSideVariationSchema = ServerSideProductSchema.omit({
  categories: true,
  variations: true,
});

export type ServerSideVariationSchema = z.infer<typeof ServerSideVariationSchema>;

export default class ProductsAPI extends API {
  static async getCategories(): Promise<ProductCategorySchema[]> {
    const response = await this.client.get("/products/categories", {
      params: { per_page: "100" },
    });

    return ProductCategorySchema.array().parse(response.data);
  }

  static async getProducts(params: Record<string, string | number> = {}): Promise<ServerSideProductSchema[]> {
    const response = await this.client.get("/products", {
      params: {
        per_page: "100",
        status: "publish",
        orderby: "popularity",
        ...params,
      },
    });
    try {
      return ServerSideProductSchema.array().parse(response.data);
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  static async getVariations(productId: number): Promise<ServerSideVariationSchema[]> {
    const response = await this.client.get(`/products/${productId}/variations`, {
      params: {
        per_page: "100",
        status: "publish",
      },
    });
    try {
      return ServerSideVariationSchema.array().parse(response.data);
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  static async updateProduct(productId: ServerSideProductSchema['id'], data: Partial<ServerSideProductSchema>) {
    return await this.client.put(`/products/${productId}`, data);
  }

  static async updateVariation(productId: number, variationId: number, data: Partial<ServerSideVariationSchema>) {
    return await this.client.put(`/products/${productId}/variations/${variationId}`, data);
  }

  static async updateStock(productId: number, variationId: number, stockQuantity: number) {
    const data = {
      stock_quantity: stockQuantity,
      manage_stock: true  // Enable stock management if not already
    };

    if (variationId === 0) {
      // Simple product
      return await this.updateProduct(productId, data);
    } else {
      // Variation
      return await this.updateVariation(productId, variationId, data);
    }
  }

  static async disableStockManagement(productId: number, variationId: number) {
    const data = {
      manage_stock: false,
      stock_quantity: null
    };

    if (variationId === 0) {
      return await this.updateProduct(productId, data);
    } else {
      return await this.updateVariation(productId, variationId, data);
    }
  }
}
