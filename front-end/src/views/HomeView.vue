<template>
  <v-container fluid>
    <v-row class="d-print-none">
      <v-col cols="1">
        <v-btn
          v-for="(cartReference, index) in cartsWithMeta"
          :key="cartReference.key"
          @click="setActiveCart(cartReference.key)"
          :color="getCartBtnColor(cartReference)"
          class="mb-2 w-100"
          :variant="getCartBtnVariant(cartReference)"
        >
          <template v-slot:prepend>
            <v-chip size="x-small">{{ index + 1 }}</v-chip>
          </template>
          {{ cartReference.label }}
        </v-btn>
        <new-cart class="w-100" />
        <v-spacer class="mt-10"></v-spacer>
        <v-btn to="/settings" class="w-100 mb-2">Settings</v-btn>
        <v-spacer class="mt-10"></v-spacer>
        <h6 v-if="recentlyClosed.length > 0">Closed:</h6>
        <v-btn
          v-for="recentOrder in recentlyClosed"
          :key="recentOrder"
          variant="flat"
          class="mt-2"
          @click="() => openOrder(recentOrder.toString())"
        >
          {{ recentOrder }}
        </v-btn>
      </v-col>
      <v-col cols="7">
        <command-input />
        <item-list />
      </v-col>
      <v-col cols="4">
        <drawer-dialog />
        <shopping-cart />
      </v-col>
    </v-row>
    <v-row
      id="print-area"
      :style="{ width: `${printWidth}mm` }"
      class="d-print-block d-none"
    >
      <bill-print v-if="printMode === 'bill'" />
      <kot-print v-if="printMode === 'kot'" />
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from "vue";

// Components
import ShoppingCart from "@/components/ShoppingCart.vue";
import BillPrint from "@/components/BillPrint.vue";
import KotPrint from "@/components/KotPrint.vue";
import DrawerDialog from "@/components/DrawerDialog.vue";
import ItemList from "@/components/ItemList.vue";
import CommandInput from "@/components/CommandInput.vue";
import { useCartStore, useCartManagerStore, type CartRef } from "@/stores/cart";
import { mapActions, mapState } from "pinia";
import NewCart from "@/components/NewCart.vue";
import config from "../utils/config";
import { useDynamicCartStore } from "@/stores/cart";
import OrdersAPI from "../api/orders";
import OpenOrder from '@/commands/open-order'

export default defineComponent({
  name: "HomeView",

  components: {
    ShoppingCart,
    ItemList,
    CommandInput,
    BillPrint,
    KotPrint,
    DrawerDialog,
    NewCart,
  },

  computed: {
    ...mapState(useCartManagerStore, [
      "activeCartReference",
      "cartsWithMeta",
      "printMode",
      "drawerDialog",
      "recentlyClosed",
    ]),

    printWidth() {
      return config.printWidth;
    },
  },

  methods: {
    ...mapActions(useCartManagerStore, ["setActiveCart", "hideDrawerDialog"]),
    ...mapActions(useCartStore, ["clearCart"]),

    openOrder(orderId: string) {
      new OpenOrder(orderId, true).execute();
    },

    getCartBtnVariant(cartReference: CartRef) {
      if (this.activeCartReference === cartReference.key) {
        return "elevated";
      }

      if (cartReference.meta?.hasItems) {
        return "outlined";
      }

      return "flat";
    },
    getCartBtnColor(cartReference: CartRef) {
      if (cartReference.meta?.hasIssue) {
        return "warning";
      }

      if (this.activeCartReference === cartReference.key) {
        return "primary";
      }

      return "default";
    },

    async loadOpenOrders() {
      // Load pending orders from API
      const orders = await OrdersAPI.listOrders({
        status: "pending,processing",
      });
      const cartManagerStore = useCartManagerStore();
      Object.values(orders.data).forEach(async (order: object) => {
        const orderCartNameMeta = order.meta_data.find(
          (meta: { key: string }) => meta.key === "cart_name"
        );
        const orderCartName = orderCartNameMeta.value
          ? orderCartNameMeta.value
          : "U";

        let cartStore = cartManagerStore.getCartStoreById(order.id);
        if (!cartStore) {
          cartStore = cartManagerStore.getCartStoreByName(orderCartName);
        }
        // In case we got the cartStore by name and accidentally got one that belongs to another order
        if (cartStore.hasItems && cartStore.orderId !== order.id ) {
          cartStore = useDynamicCartStore(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            cartManagerStore.createCart(orderCartName)!.key
          );
        }

        if (!cartStore.isDirty) {
          cartStore.hydrateOrderData(order);
        }
      });
    },

    async loadUnsavedOrder() {
      // Handle a pending order that couldn't be saved previously due to auth issue.
      const cartInfoString = localStorage.getItem("cartInfo");
      if (cartInfoString) {
        const cartInfo = JSON.parse(cartInfoString);
        const cartStore = useCartStore();
        cartStore.hydrateOrderData(cartInfo.cartPayload);
        cartStore.orderId = cartInfo.orderId;

        await cartStore.saveOrder(true);

        window.localStorage.removeItem("cartInfo");
      }
    },
  },

  async mounted() {
    this.setActiveCart("T/1");
    this.loadUnsavedOrder();

    this.loadOpenOrders();

    // Load open orders every 30 seconds
    setInterval(() => {
      this.loadOpenOrders();
    }, 30000);
  },
});
</script>

<style>
#print-area > * {
  width: 100%;
}
</style>
