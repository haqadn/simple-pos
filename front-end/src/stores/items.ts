import ProductsAPI from "@/api/products";
import { defineStore } from "pinia";

export const useItemStore = defineStore("items", {
  state: () => ({
    items: [],
  }),
  actions: {
    async loadItems() {
      const response = await ProductsAPI.getProducts();
      const items = response.data;

      this.items = items.map((item) => {
        return {
          ...item,
          price: parseFloat(item.price),
          regular_price: parseFloat(item.regular_price),
        }
      });
    }
  }
});
