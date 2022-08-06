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
    payment: 0,
  }),
  getters: {
    subtotal(state) {
      return Object.values(state.items).reduce((total, item) => {
        return total + item.price * item.quantity;
      }, 0);
    },
    remainingAmount(state) {
      return state.subtotal - state.payment;
    },
    cartPayload(state) {
      const data = {};
      if (state.customer.name || state.customer.phone) {
        data.billing = {
          first_name: state.customer.name.split(" ")[0],
          last_name: state.customer.name.split(" ")[1],
          phone: state.customer.phone,
          username: state.customer.phone,
        };
      }
      data.line_items = Object.values(state.items).map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
      }));

      return data;
    }
  },
  actions: {
    async saveOrder() {
      if( this.orderId ) {
        const response = await OrdersAPI.updateOrder(this.orderId, this.cartPayload);
      } else {
        const response = await OrdersAPI.saveOrder(this.cartPayload);
      }
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
      this.items = {};
      data.line_items.forEach((item) => {
        this.items[item.product_id] = {
          ...item,
          id: item.product_id,
          product_id: undefined, // We are using `id` instead of `product_id` in the local state
        };
      });
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
    addCartPayment(amount) {
      this.payment = amount;
    },
    clearCart() {
      this.$reset();
    },
  },
});
