import ProductsAPI from "@/api/products";
import type { Product } from "@/types";
import config from "@/utils/config";
import { defineStore } from "pinia";

export const useItemStore = defineStore("items", {
  state: () => ({
    items: <Product[]> [],
    categories: [],
  }),
  getters: {
    productCategoryMap() {
      const items = this.items;
      const catMap: { [productId: number]: number[] } = {};
      items.forEach(
        (item: { id: number; categories?: Array<{ id: number }> }) => {
          if (item.categories) {
            catMap[item.id] = item.categories.map((category) => category.id);
          }
        }
      );

      return catMap;
    },
  },
  actions: {
    async loadItems() {
      const response = await ProductsAPI.getProducts();
      const items = response.data;

      this.items = items.map((item) => {
        return {
          ...item,
          price: parseFloat(item.price),
          regular_price: parseFloat(item.regular_price),
        };
      });
    },
    async loadCategories() {
      const response = await ProductsAPI.getCategories();
      const items = response.data;

      this.categories = items;
    },
    shouldSkipProductFromKot(productId: number) {
      // Do not skip if we cannot determine the product category
      if (!this.productCategoryMap[productId]) {
        return false;
      }
      return this.productCategoryMap[productId].some((category) =>
        config.skipKotCategories.includes(category)
      );
    },
  },
});
