import ProductsAPI from "@/api/products";
import type { LineItem, Product } from "@/types";
import config from "@/utils/config";
import { defineStore } from "pinia";

export const useCatalogStore = defineStore("catalog", {
  state: () => ({
    products: <Product[]>[],
    categories: [],
  }),
  getters: {
    productCategoryMap() {
      const products = this.products;
      const catMap: { [productId: number]: number[] } = {};
      products.forEach(
        (product: { id: number; categories?: Array<{ id: number }> }) => {
          if (product.categories) {
            catMap[product.id] = product.categories.map((category) => category.id);
          }
        }
      );

      return catMap;
    },
  },
  actions: {
    async loadProducts() {
      const response = await ProductsAPI.getProducts();
      const products = <Array<Product>>[];

      for (const product of response.data as Array<any>) {
        if (product.variations.length === 0) {
          products.push({
            ...product,
            price: parseFloat(product.price),
            categories: product.categories,
          });
        } else {
          const variations = await ProductsAPI.getVariations(product.id);
          (variations.data as Array<any>).forEach((variation) => {
            products.push({
              ...variation,
              name: `${product.name} - ${variation.name}`,
              price: parseFloat(variation.price),
              categories: product.categories,
            });
          });
        }
      }

      this.products = products;
    },
    async loadCategories() {
      const response = await ProductsAPI.getCategories();
      const categories = response.data;

      this.categories = categories;
    },
    shouldSkipProductFromKot(lineItem: LineItem) {
      const id = lineItem.variation_id > 0 ? lineItem.variation_id : lineItem.product_id;
      // Do not skip if we cannot determine the product category
      if (!this.productCategoryMap[id]) {
        return false;
      }
      return this.productCategoryMap[id].some((category) =>
        config.skipKotCategories.includes(category)
      );
    },
  },
});
