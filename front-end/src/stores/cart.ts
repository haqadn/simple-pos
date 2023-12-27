/* eslint-disable prettier/prettier */
import CouponsAPI from "@/api/coupons";
import OrdersAPI from "@/api/orders";
import type { LineItem, Product } from "@/types";
import config from "@/utils/config";
import { defineStore } from "pinia";
import { v4 as uuid4 } from "uuid";
import { alertAsync, confirmAsync } from "./alerts";
import { useItemStore } from "./items";
import { debounce } from "@/utils/debounce";

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
      orderId: <null | string> null,
      orderTime: "",
      status: "pending",
      customerNote: "",
      payment: 0,
      setPaid: false,
      coupons: [],
      discountTotal: 0,
      saving: false,
      previousKot: "[]",
      referencePayload: {},
      autosaveConfigured: false,
      orderIdSalt: Math.floor(Math.random() * 90) + 10,
    }),
    getters: {
      reference() {
        return cartReference;
      },
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
        // Match the reference payload if the cart is fresh
        if(!this.hasItems) {
          return {};
        }

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
              key: "previous_kot",
              value: state.previousKot,
            },
            {
              key: "order_id_salt",
              value: state.orderIdSalt,
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
      },
      currentKot(state) {
        const itemStore = useItemStore();

        return JSON.stringify(state.line_items.filter((li) => {
          return ! itemStore.shouldSkipProductFromKot(li.product_id);
        }).map((li) => ({
          product_id: li.product_id,
          quantity: li.quantity,
        })));
      },
      kotSent(state) {
        return !this.hasItems || state.previousKot === this.currentKot;
      },
      invoiceNumber() : string {
        const changed = (this.orderId as unknown as number) - this.orderIdSalt;
        return `${changed}${this.orderIdSalt}`;
      },
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
          alertAsync(error.message);
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
          const payload = {
            ...this.cartPayload,
            line_items: this.adjustLineItems(this.cartPayload.line_items),
          };

          if (this.orderId) {
            response = await OrdersAPI.updateOrder(
              this.orderId,
              payload
            );
          } else {
            if (! this.hasItems) {
              this.saving = false;
              return;
            }
            response = await OrdersAPI.saveOrder(payload);
          }
          if (withUpdate) {
            this.hydrateOrderData(response.data);
          }
        } catch (error) {
          if (await confirmAsync(`Error saving order. Logout and login again! ${error}`)) {
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
        this.orderTime = data.date_created;
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
        this.previousKot = data.meta_data.find((meta) => meta.key === "previous_kot")?.value;
        this.orderIdSalt = parseInt(data.meta_data.find((meta) => meta.key === "order_id_salt")?.value) || this.orderIdSalt;
        
        this.referencePayload = this.cartPayload;
      },
      setCustomerNote(value: string) {
        this.customerNote = value;
      },
      /**
       * If there is an existing line item for the same product, we need to set the quantity to zero.
       * This will make sure the calculation is done again. Woocommerce depends on the API caller to
       * set the line item subtotal, which isn't reliable.
       */
      adjustLineItems(line_items) {
        const newLineItems = [];
        const itemsBeingRemoved = [];
        if( !this.referencePayload.line_items ) {
          return line_items;
        }

        line_items.forEach((item) => {
          // if quantity is different from referencePayload
          const existingLineItem = this.referencePayload.line_items.find(
            (li) => li.product_id === item.product_id
          );
          if (
            existingLineItem &&
            existingLineItem.quantity !== item.quantity
          ) {
            // Set existing line item quantity to zero.
            existingLineItem.quantity = 0;
            itemsBeingRemoved.push(existingLineItem);

            if( item.quantity > 0 ) {
              newLineItems.push({
                ...item,
                id: undefined,
              });
            }
          } else if( item.quantity > 0 ) {
            newLineItems.push(item);
          }
        });

        // The order matters on Woo. For some reason, if we add the new line items first, and then remove the old ones, it doesn't work.
        return [
          ...itemsBeingRemoved,
          ...newLineItems,
        ];
      },
      setItemQuantity(product: Product, quantity: number) {
        const actualQuantity = Math.max(0, quantity);

        let items = [...this.line_items];

        // Do we need to insert a new line item, or can we update the existing one.
        let needsNewItem = true;

        items = items.map((line_item) => {
          if (line_item.product_id === product.id) {
              line_item.quantity = actualQuantity;
              needsNewItem = false;
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
      updatePreviousKot() {
        this.previousKot = this.currentKot;
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
      setupAutosave() {
        if( this.autosaveConfigured ) {
          return;
        }
        this.autosaveConfigured = true;
        const debouncedSave = debounce(() => {
          this.saveOrder(false);
        }, 5000);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        this.$subscribe((_mutation, _state) => {
          if( this.isDirty ) {
            debouncedSave();
          }
        });
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
    recentlyClosed: <number[]> [],
    printMode: 'bill',
    drawerDialog: false,
  }),
  actions: {
    addRecentOrder( id: number ) {
      this.recentlyClosed = [ id, ...this.recentlyClosed.slice(0, 4) ]
    },
    hideDrawerDialog() {
      this.drawerDialog = false;
    },
    async showDrawerDialog() {
      this.drawerDialog = true;
      this.cartStore.status = 'completed';
      await this.cartStore.saveOrder();
    },
    rotateCarts(indexes: number[]) {
      // If only one index is provided, switch current cart with that index.
      if (indexes.length === 1) {
        const activeCartIndex = this.carts.findIndex(
          (cart) => cart.key === this.activeCartReference
        );
        indexes.push(activeCartIndex);
      }

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
      this.cartStore.setupAutosave();
    },
    selectCart(index: number) {
      this.setActiveCart(this.carts[index].key);
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
    },
    getCartStoreById(id: number) {
      const foundCartRef = this.carts.find( (cartRef: CartRef ) => {
        const cart = useDynamicCartStore(cartRef.key);
        return cart.orderId === id;
      });

      if( foundCartRef ) {
        return useDynamicCartStore( foundCartRef.key );
      }
    }
  },
  getters: {
    activeCart: (state) => state.carts.find((cart) => cart.key === state.activeCartReference),
    cartStore: (state) => useDynamicCartStore(state.activeCartReference),
    cartsWithMeta: (state) => {
      const carts = [...state.carts];


      carts.forEach((cart) => {
        const cartStore = useDynamicCartStore(cart.key);
        cart.meta = {
          hasIssue: !cartStore.kotSent,
          hasItems: cartStore.hasItems,
        };
      });
      return carts;
    }
  },
});

// Easily access the active cart store from anywhere.
export const useCartStore = () => useCartManagerStore().cartStore;
