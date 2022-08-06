import OrdersAPI from "@/api/orders";
import { defineStore } from "pinia";

export const useCartStore = defineStore("cart", {
  state: () => ({
    customer: {
      name: "",
      phone: "",
    },
    items: {},
    orderId: null,
  }),
  actions: {
    async saveOrder() {
      const data = {};
      if (this.customer.name || this.customer.phone) {
        data.billing = {
          first_name: this.customer.name.split(" ")[0],
          last_name: this.customer.name.split(" ")[1],
          phone: this.customer.phone,
          username: this.customer.phone,
        };
      }
      data.line_items = Object.values(this.items).map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
      }));

      const response = await OrdersAPI.saveOrder(data);
      this.updateOrderData(response.data);
    },
    async loadOrder(id) {
      this.clearCart();
      const response = await OrdersAPI.getOrder(id);
      this.updateOrderData(response.data);
    },
    updateOrderData(data) {
      this.addCartCustomerInfo(
        "name",
        `${data.billing.first_name} ${data.billing.last_name}`.trim()
      );
      this.addCartCustomerInfo("phone", data.billing.phone);
      this.orderId = data.id;
      this.items = data.line_items.map((item) => ({
        ...item,
        id: item.product_id,
        product_id: undefined, // We are using `id` instead of `product_id` in the local state
      }));
    },
    setItemQuantity(item, quantity) {
      if (!this.items[item.id]) {
        this.addToCart(item, quantity);
      }

      const diff = parseInt(quantity) - this.items[item.id].quantity;
      if (diff > 0) {
        this.addToCart(item, diff);
      } else if (diff < 0) {
        this.reduceFromCart(item, -diff);
      }
    },
    addToCart(item, quantity = 1) {
      if (quantity < 1) {
        return;
      }
      this.items[item.id] = {
        ...item,
        quantity:
          item.id in this.items
            ? this.items[item.id].quantity + parseInt(quantity)
            : parseInt(quantity),
      };
    },
    reduceFromCart(item, quantity = 1) {
      if (!(item.id in this.items) || quantity < 1) return;

      this.items[item.id] = {
        ...item,
        quantity: this.items[item.id].quantity - parseInt(quantity),
      };

      if (this.items[item.id].quantity <= 0) {
        delete this.items[item.id];
      }
    },
    addCartCustomerInfo(info, value) {
      this.customer[info] = value;
    },
    clearCart() {
      this.$reset();
    },
  },
});
