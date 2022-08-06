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
    status: 'pending',
    customerNote: "",
    payment: 0,
    setPaid: false,
  }),
  getters: {
    subtotal(state) {
      return Object.values(state.items).reduce((total, item) => {
        return total + item.price * item.quantity;
      }, 0);
    },
    total(state) {
      return state.subtotal;
    },
    remainingAmount(state) {
      return state.total - state.payment;
    },
    cartPayload(state) {
      const data = {
        status: state.status,
        set_paid: state.setPaid,
        customer_note: state.customerNote,
      };
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
        id: item.line_item_id,
        quantity: item.quantity,
      }));

      return data;
    }
  },
  actions: {
    async saveOrder() {
      let response;
      if( this.orderId ) {
        response = await OrdersAPI.updateOrder(this.orderId, this.cartPayload);
      } else {
        response = await OrdersAPI.saveOrder(this.cartPayload);
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

      this.status = data.status;
      this.orderId = data.id;
      this.customerNote = data.customer_note;
      this.items = {};
      data.line_items.forEach((item) => {
        this.items[item.product_id] = {
          ...item,
          line_item_id: item.id,
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
      if( amount >= this.total ) {
        this.setPaid = true;
      }
      this.customerNote = `Last recorded payment: ${amount}`;
    },
    clearCart() {
      this.$reset();
    },
  },
});
