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
    reduceFromCart(item, quantity = 1) {
      if (!(item.id in this.items)) return;

      this.items[item.id] = {
        ...item,
        quantity: this.items[item.id].quantity - parseInt(quantity),
      };

      if (this.items[item.id].quantity <= 0) {
        delete this.items[item.id];
      }
    },
    clearCart() {
      this.items = {};
    },
  },
});
