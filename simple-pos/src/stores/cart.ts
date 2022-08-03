import { defineStore } from "pinia";

export const useCartStore = defineStore("cart", {
  state: () => ({
    items: {},
  }),
  actions: {
    addToCart(item, quantity = 1) {
      this.items[item.id] = {
        ...item,
        quantity:
          item.id in this.items
            ? this.items[item.id].quantity + parseInt(quantity)
            : parseInt(quantity),
      };
    },
    clearCart() {
      this.items = {};
    }
  },
});
