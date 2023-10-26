/* eslint-disable prettier/prettier */
import CouponsAPI from "@/api/coupons";
import OrdersAPI from "@/api/orders";
import type { LineItem, Product } from "@/types";
import config from "@/utils/config";
import { defineStore } from "pinia";
import { v4 as uuid4 } from "uuid";

type Customer = {
  name: string;
  phone: string;
};



// This creates a store for a single cart.
export const useDynamicCartStore = (orderReference: string) =>
  defineStore(`cart/${orderReference}`, {
    state: () => ({
      customer: <Customer>{
        name: "",
        phone: "",
      },
      line_items: <LineItem[]>[],
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
        return state.line_items.reduce((total, item) => {
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
          line_items: state.line_items.map((item) => ({
            product_id: item.product_id,
            id: item.line_item_id,
            quantity: item.quantity,
          })),
          meta_data: [
            {
              key: "payment_amount",
              value: state.payment,
            },
          ],
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
      /**
       * A filtered list of line items keyd by id.
       *
       * Used for legacy purposes and easily being able to check if a product exists in the cart.
       */
      items(state) {
        const itemsMap: { [id: number]: LineItem } = {};
        state.line_items.forEach((li) => {
          if (li.quantity > 0) {
            itemsMap[li.product_id] = li;
          }
        });

        return itemsMap;
      },
    },
    actions: {
      async addCoupon(code: string) {
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
          if (this.coupons.find((c: { code: string }) => c.code === code)) {
            return;
          }
          this.coupons.push(coupon);
        } catch (error) {
          return alert(error.message);
        }
      },
      removeCoupon(code: string) {
        this.coupons = this.coupons.filter(
          (coupon: { code: string }) => coupon.code !== code
        );
      },
      async saveOrder(withUpdate = true) {
        if (this.saving) {
          return;
        }
        try {
          let response;
          this.saving = true;
          if (this.orderId) {
            response = await OrdersAPI.updateOrder(
              this.orderId,
              this.cartPayload
            );
          } else {
            if (
              this.line_items.reduce(
                (total, item) => total + item.quantity,
                0
              ) === 0
            ) {
              this.saving = false;
              return;
            }
            response = await OrdersAPI.saveOrder(this.cartPayload);
          }
          if (withUpdate) {
            this.hydrateOrderData(response.data);
          }
        } catch (error) {
          if (confirm(`Error saving order. Logout and login again! ${error}`)) {
            const cartInfo = JSON.stringify({
              orderId: this.orderId,
              cartPayload: this.cartPayload,
            });

            window.localStorage.setItem("cartInfo", cartInfo);
            const currentUrl = window.location.href;
            window.location.href = `../wp-login.php?redirect_to=${currentUrl}`;
          }
        } finally {
          this.saving = false;
        }
      },
      async loadOrder(id: string) {
        const response = await OrdersAPI.getOrder(id);
        this.clearCart();
        this.hydrateOrderData(response.data);
      },
      hydrateOrderData(data) {
        if (data.billing) {
          this.addCartCustomerInfo(
            "name",
            `${data.billing.first_name} ${data.billing.last_name}`.trim()
          );
          this.addCartCustomerInfo("phone", data.billing.phone);
        }

        this.status = data.status;
        this.orderId = data.id;
        this.customerNote = data.customer_note;
        this.discountTotal = parseFloat(data.discount_total);
        this.line_items = [];
        data.line_items.forEach((item) => {
          this.line_items.push({
            ...item,
            line_item_id: item.id,
            product_id: item.product_id,
          });
        });
        this.coupons = data.coupon_lines || [];
        this.payment = parseFloat(
          data.meta_data.find((meta) => meta.key === "payment_amount").value
        );
      },
      setItemQuantity(product: Product, quantity: number) {
        const actualQuantity = Math.max(0, quantity);

        let items = [...this.line_items];

        // Do we need to insert a new line item, or can we update the existing one.
        let needsNewItem = true;

        items = items.map((line_item) => {
          /*
           * If there is an existing line item for the same product, we need to set the quantity to zero.
           * This will make sure the calculation is done again. Woocommerce depends on the API caller to
           * set the line item subtotal, which isn't reliable.
           */
          if (line_item.product_id === product.id) {
            if (typeof line_item.line_item_id !== "undefined") {
              line_item.quantity = 0;
            } else {
              line_item.quantity = actualQuantity;
              needsNewItem = false;
            }
          }

          return line_item;
        });

        if (needsNewItem) {
          items.push({
            name: product.name,
            price: product.price,
            product_id: product.id,
            quantity: actualQuantity,
          });
        }

        this.line_items = items;
      },
      addToCart(product: Product, quantity = 1) {
        if (quantity < 1) {
          return;
        }

        let existingQuantity = 0;
        const existingLineItem = this.line_items.find(
          (li) => li.product_id === product.id && li.quantity > 0
        );
        if (typeof existingLineItem !== "undefined") {
          existingQuantity = existingLineItem.quantity;
        }

        this.setItemQuantity(product, existingQuantity + quantity);
      },
      reduceFromCart(product: Product, quantity = 1) {
        if (quantity < 1) {
          return;
        }

        let existingQuantity = 0;
        const existingLineItem = this.line_items.find(
          (li) => li.product_id === product.id && li.quantity > 0
        );
        if (typeof existingLineItem !== "undefined") {
          existingQuantity = existingLineItem.quantity;
        }

        this.setItemQuantity(product, Math.max(0, existingQuantity - quantity));
      },
      addCartCustomerInfo(info: "name" | "phone", value: string) {
        this.customer[info] = value;
      },
      addCartPayment(amount: string) {
        const amountNumber = parseFloat(amount);
        if (isNaN(amountNumber)) {
          return;
        }
        this.payment = amountNumber;
        if (amountNumber >= this.total) {
          this.setPaid = true;
        }
      },
      clearCart() {
        const cartManagerStore = useCartManagerStore();
        const activeCart = cartManagerStore.activeCart;
        if( activeCart?.permanent ) {
          this.$reset();
          if (this.$router.currentRoute.name === "order") {
            this.$router.push({ name: "home" });
          }
        } else {
          // Delete the cart from the cart manager.
          cartManagerStore.deleteCart(activeCart.key);
        }
      },
    },
  })();

// This manages the store for multiple parallel carts.
export const useCartManagerStore = defineStore("cartManager", {
  state: () => ({
    activeCartReference: `T/${config.tables[0]}`,
    carts: config.tables.map((table) => ({
      label: `T ${table}`,
      key: `T/${table}`,
      permanent: true,
    })),
  }),
  actions: {
    setActiveCart(reference: string) {
      this.activeCartReference = reference;
    },
    createCart() {
      const label = prompt(
        "Enter table name",
        "P"
      );
      if(!label) return;

      const key = uuid4();

      this.carts.push({
        label,
        key,
        permanent: false,
      });

      this.activeCartReference = key;
    },
    deleteCart(reference: string) {
      // Delete the currently active cart.
      this.carts = this.carts.filter((cart) => cart.key !== reference);
      this.activeCartReference = this.carts[0].key;
    }
  },
  getters: {
    activeCart: (state) => state.carts.find((cart) => cart.key === state.activeCartReference),
    cartStore: (state) => useDynamicCartStore(state.activeCartReference),
  },
});

// Easily access the active cart store from anywhere.
export const useCartStore = () => useCartManagerStore().cartStore;
