import { defineStore } from "pinia";

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: {}
  }),
  actions: {
    addToCart(item) {
      this.items[item.id] = {
        ...item,
        quantity: item.id in this.items ? this.items[item.id].quantity + 1 : 1
      };
    }
  }
});
