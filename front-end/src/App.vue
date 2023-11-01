<template>
  <v-app>
    <alert-dialog />
    <confirm-dialog />
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import OrdersAPI from "./api/orders";
import { useCartManagerStore, useDynamicCartStore } from "./stores/cart";
import AlertDialog from "./components/AlertDialog.vue";
import ConfirmDialog from "./components/ConfirmDialog.vue";

export default defineComponent({
  components: { AlertDialog, ConfirmDialog },
  name: "App",

  data() {
    return {
      //
    };
  },
  async mounted() {
    // Load pending orders from API
    const orders = await OrdersAPI.listOrders({
      status: "pending",
    });

    const cartManagerStore = useCartManagerStore();
    Object.values(orders.data).forEach((order: object) => {
      const orderCartNameMeta = order.meta_data.find(
        (meta: { key: string; }) => meta.key === "cart_name"
      );
      const orderCartName = orderCartNameMeta ? orderCartNameMeta.value : "U";

      let cartStore = cartManagerStore.getCartStoreByName(orderCartName);
      if (cartStore.hasItems && cartStore.orderId !== order.id ) {
        cartStore = useDynamicCartStore(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          cartManagerStore.createCart(orderCartName)!.key
        );
      }

      cartStore.hydrateOrderData(order);
      cartStore.setupAutosave();
    });
  },
});
</script>
