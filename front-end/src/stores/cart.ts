import CouponsAPI from "@/api/coupons";
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
    status: "pending",
    customerNote: "",
    payment: 0,
    setPaid: false,
    coupons: [],
    discountTotal: 0,
    wifiPassword: "",
    saving: false,
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
        coupon_lines: state.coupons.map((coupon) => ({
          code: coupon.code,
        })),
        line_items: Object.values(state.items).map((item) => ({
          product_id: item.id,
          id: item.line_item_id,
          quantity: item.quantity,
        })),
        meta_data: [
          {
            key: "payment_amount",
            value: state.payment,
          }
        ]
      };
      if (state.customer.name || state.customer.phone) {
        data.billing = {
          first_name: state.customer.name.split(" ")[0],
          last_name: state.customer.name.split(" ")[1],
          phone: state.customer.phone,
          username: state.customer.phone,
        };
      }

      return data;
    },
  },
  actions: {
    async addCoupon(code) {
      try {
        const response = await CouponsAPI.getCoupon(code);
        const coupon = response.data[0];
        if (!coupon) {
          throw new Error("Coupon not found");
        }
        const expiry = new Date(coupon.date_expires);
        if (coupon.date_expires !== null && new Date() > expiry) {
          console.log(coupon, typeof coupon.date_expires, expiry, new Date());
          throw new Error("Coupon expired");
        }
        if (this.coupons.find((c) => c.code === code)) {
          return;
        }
        this.coupons.push(coupon);
      } catch (error) {
        return alert(error.message);
      }
    },
    removeCoupon(code) {
      this.coupons = this.coupons.filter((coupon) => coupon.code !== code);
    },
    async saveOrder(withUpdate = true) {
      let response;
      if (this.saving) {
        return;
      }
      if (this.orderId) {
        this.saving = true;
        response = await OrdersAPI.updateOrder(this.orderId, this.cartPayload);
        this.saving = false;
      } else {
        if (
          Object.values(this.items).reduce(
            (total, item) => total + item.quantity,
            0
          ) === 0
        ) {
          return;
        }
        this.saving = true;
        response = await OrdersAPI.saveOrder(this.cartPayload);
        this.saving = false;
      }
      if (withUpdate) {
        this.updateOrderData(response.data);
      }
    },
    async loadOrder(id) {
      const response = await OrdersAPI.getOrder(id);
      this.clearCart();
      this.updateOrderData(response.data, true);
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
      this.discountTotal = parseFloat(data.discount_total);
      this.items = {};
      data.line_items.forEach((item) => {
        this.items[item.product_id] = {
          ...item,
          line_item_id: item.id,
          id: item.product_id,
          product_id: undefined, // We are using `id` instead of `product_id` in the local state
        };
      });
      this.coupons = data.coupon_lines || [];
      this.payment = parseFloat(data.meta_data.find((meta) => meta.key === "payment_amount").value);

      if (data.meta_data.find((meta) => meta.key === "wifi_password")) {
        this.wifiPassword = data.meta_data.find(
          (meta) => meta.key === "wifi_password"
        ).value;
      }

      // this.$router.push({
      //   name: "order",
      //   params: { id: this.orderId },
      // });
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

      this.items[item.id].quantity = Math.max(0, this.items[item.id].quantity);
    },
    addCartCustomerInfo(info, value) {
      this.customer[info] = value;
    },
    addCartPayment(amount) {
      amount = parseFloat(amount);
      if (isNaN(amount)) {
        return;
      }
      this.payment = amount;
      if (amount >= this.total) {
        this.setPaid = true;
      }
      this.customerNote = `Payment before change: ${amount}`;
    },
    clearCart() {
      this.$reset();
      if( this.$router.currentRoute.name === 'order' ) {
        this.$router.push({ name: 'home' });
      }
    },
  },
});
