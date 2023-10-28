/* eslint-disable prettier/prettier */
import CouponsAPI from "@/api/coupons";
import OrdersAPI from "@/api/orders";
import type { LineItem, Product } from "@/types";
import config from "@/utils/config";
import { defineStore } from "pinia";
import { v4 as uuid4 } from "uuid";
import { nextTick } from "vue";

type Customer = {
  name: string;
  phone: string;
};



// This creates a store for a single cart.
export const useDynamicCartStore = (cartReference: string) =>
  defineStore(`cart/${cartReference}`, {
    state: () => ({
      customer: <Customer | null> null,
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
      kotSent: false,
      referencePayload: {},
    }),
    getters: {
      cartName() : string {
        // Find the cart name from cartManagerStore.
        const cartManagerStore = useCartManagerStore();
        const cart = cartManagerStore.carts.find(
          (cart) => cart.key === cartReference
        );

        return cart?.label || "";
      },
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
            {
              key: "cart_name",
              value: this.cartName,
            },
            {
              key: "kot_sent",
              value: state.kotSent ? "yes" : "no",
            }
          ],
        };
        if (state.customer?.name || state.customer?.phone) {
          data.billing = {
            first_name: state.customer.name.split(" ")[0],
            last_name: state.customer.name.split(" ").splice(1).join(" "),
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
      hasItems(state) {
        return state.line_items.some((li) => li.quantity > 0);
      },
      isDirty(state) {
        return JSON.stringify(state.referencePayload) !== JSON.stringify(this.cartPayload);
      }
    },
    actions: {
      setCartName(name: string) {
        // Find the cart name from cartManagerStore.
        const cartManagerStore = useCartManagerStore();
        const cart = cartManagerStore.carts.find(
          (cart) => cart.key === cartReference
        );

        if(cart) {
          cart.label = name;
        }
      },
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
            if (! this.hasItems) {
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
        this.clearCart(false);
        this.hydrateOrderData(response.data);
      },
      async hydrateOrderData(data) {
        if (data.billing) {
          const name = `${data.billing.first_name} ${data.billing.last_name}`.trim();
          const phone = data.billing.phone;
          if ( name ) {
            this.addCartCustomerInfo( "name", name );
          }
          if ( phone ) {
            this.addCartCustomerInfo("phone", phone);
          }
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
          data.meta_data.find((meta) => meta.key === "payment_amount")?.value
        );
        this.kotSent = data.meta_data.find((meta) => meta.key === "kot_sent")?.value === "yes";
        
        await nextTick();
        this.referencePayload = this.cartPayload;
      },
      /**
       * WooCommerce doesn't handle line item updates well. So we need to set existing line items quantity to zero
       * and add new line items with the updated quantity.
       */
      // adjustLineItems() {
      //   // Create a map of line items by product_id and quantity from referencePayload.
      //   const referenceLineItemsMap: { [id: number]: number } = {};
      //   this.referencePayload.line_items.forEach((li) => {
      //     referenceLineItemsMap[li.product_id] = li.quantity;
      //   });

      //   const newLineItems = [];
      //   // Loop through each line items
      //   this.line_items.forEach((li) => {
      //     // If line item matches the reference payload, insert it into newLineItems.
      //     if (
      //       referenceLineItemsMap[li.product_id] &&
      //       referenceLineItemsMap[li.product_id] === li.quantity
      //     ) {
      //       newLineItems.push(li);
      //     }

      //     // If line item doesn't match the reference payload, insert one with quantity zero, and another with the updated quantity.
      //     if (
      //       referenceLineItemsMap[li.product_id] &&
      //       referenceLineItemsMap[li.product_id] !== li.quantity
      //     ) {
      //       newLineItems.push({
      //         ...li,
      //         quantity: 0,
      //       });
      //       newLineItems.push({
      //         name: li.name,
      //         product_id: li.product_id,
      //         quantity: li.quantity,
      //       });
      //     }
      //   });
      // },
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
              // The existing line item isn't saved in the database yet. So we can update the quantity directly.
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
        if( !this.customer ) {
          this.customer = {
            name: "",
            phone: "",
          };
        }
        this.customer = {
          ...this.customer,
          [info]: value,
        };
      },
      addCartPayment(amount: string) {
        let amountNumber = parseFloat(amount);
        if (isNaN(amountNumber)) {
          amountNumber = 0;
        }
        this.payment = amountNumber;
        if (amountNumber >= this.total) {
          this.setPaid = true;
        }
      },
      markKotPrinted() {
        if( this.kotSent ) return;
        this.kotSent = true;
      },
      clearCart(deleteCart = true) {
        const cartManagerStore = useCartManagerStore();
        const activeCart = cartManagerStore.activeCart;
        if( activeCart?.permanent ) {
          this.$reset();
          this.setCartName(activeCart.originalLabel as string);
          if (this.$router.currentRoute.name === "order") {
            this.$router.push({ name: "home" });
          }
        } else if(deleteCart) {
          // Delete the cart from the cart manager.
          cartManagerStore.deleteCart(activeCart.key);
        }
      },
    },
  })();

export type CartRef = { 
  label: string, 
  key: string, 
  originalLabel?: string, 
  permanent: boolean
  meta?: {
    [key: string]: any
  }
};

// This manages the store for multiple parallel carts.
export const useCartManagerStore = defineStore("cartManager", {
  state: () => ({
    activeCartReference: `T/${config.tables[0]}`,
    carts: <CartRef[]> (config.tables.map((table) => ({
      label: `T ${table}`,
      key: `T/${table}`,
      originalLabel: `T ${table}`,
      permanent: true,
    }))),
    printMode: 'bill',
  }),
  actions: {
    rotateCarts(indexes: number[]) {
      const carts = [...this.carts];

      // Set first carts key to second carts key, and so on. The last carts key is set to the first carts key.
      const firstKey = carts[indexes[0]].key;
      for( let i = 0; i < indexes.length - 1; i++ ) {
        carts[indexes[i]].key = carts[indexes[i + 1]].key;
      }
      carts[indexes[indexes.length - 1]].key = firstKey;

      this.carts = carts;
    },
    setPrintMode(mode: string) {
      this.printMode = mode;
    },
    setActiveCart(reference: string) {
      this.activeCartReference = reference;
    },
    selectCart(index: number) {
      this.activeCartReference = this.carts[index].key;
    },
    createCart(label: string) {
      if(!label) return;

      const key = uuid4();

      const cart = {
        label,
        key,
        permanent: false,
      };

      this.carts.push(cart);

      this.activeCartReference = key;

      return cart;
    },
    deleteCart(reference: string) {
      // Delete the currently active cart.
      this.carts = this.carts.filter((cart) => cart.key !== reference);
      this.activeCartReference = this.carts[0].key;
    },
    getCartStoreByName(name: string) {
      let cart = this.carts.find((cart) => cart.label === name);
      if( !cart ) {
        cart = this.createCart(name) as { label: string, key: string, originalLabel?: string, permanent: boolean};
      }
      return useDynamicCartStore(cart.key);
    }
  },
  getters: {
    activeCart: (state) => state.carts.find((cart) => cart.key === state.activeCartReference),
    cartStore: (state) => useDynamicCartStore(state.activeCartReference),
    cartsWithMeta: (state) => {
      const carts = [...state.carts];
      carts.forEach((cart) => {
        cart.meta = {
          hasIssue: false,
        };
        const cartStore = useDynamicCartStore(cart.key);
        if(!cartStore.kotSent) {
          cart.meta.hasIssue = true;
        }
      });
      return carts;
    }
  },
});

// Easily access the active cart store from anywhere.
export const useCartStore = () => useCartManagerStore().cartStore;
