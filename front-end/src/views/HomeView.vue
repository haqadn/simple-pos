<template>
  <v-container fluid>
    <v-row>
      <v-col class="d-print-none d-none d-lg-block" lg="1">
        <cart-list />
        <v-spacer class="mt-10"></v-spacer>
        <v-btn variant="flat" to="/settings" class="w-100 mb-2">Settings</v-btn>
        <v-btn variant="flat" to="/report" class="w-100 mb-2">Report</v-btn>
        <v-btn
          v-for="page of pageShortcuts"
          :key="page.name"
          variant="flat"
          :to="{ name: 'shortcut', params: { url: page.url } }"
          class="w-100 mb-2"
        >
          {{ page.name }}
        </v-btn>
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
      <v-col lg="11">
        <cart-list class="d-print-none d-lg-none mb-5" />
        <v-row>
          <router-view></router-view>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from "vue";

// Components
import { useCartManagerStore } from "@/stores/cart";
import { mapActions, mapState } from "pinia";
import CartList from "@/components/CartList.vue";
import config from "../utils/config";
import { useDynamicCartStore } from "@/stores/cart";
import OrdersAPI from "../api/orders";
import OpenOrder from "@/commands/open-order";
import PrintCommand from "@/commands/print";

export default defineComponent({
  name: "HomeView",

  components: {
    CartList,
  },

  computed: {
    ...mapState(useCartManagerStore, [
      "activeCartReference",
      "cartsWithMeta",
      "drawerDialog",
      "recentlyClosed",
    ]),

    pageShortcuts() {
      return config.pageShortcuts;
    },

    printWidth() {
      return config.printWidth;
    },
  },

  methods: {
    ...mapActions(useCartManagerStore, ["setActiveCart"]),

    openOrder(orderId: string) {
      new OpenOrder(orderId, true).execute();
    },

    async loadOpenOrders() {
      const cartManagerStore = useCartManagerStore();
      const orders = [
        // Orders that we currently have open
        ...(cartManagerStore.openOrderIds.length > 0
          ? ((
              await OrdersAPI.listOrders({
                include: cartManagerStore.openOrderIds.join(","),
              })
            ).data as any[])
          : []),
        // Orders that are open in another device
        ...((
          await OrdersAPI.listOrders({
            status: "pending,processing",
            exclude: cartManagerStore.openOrderIds.join(","),
          })
        ).data as any[]),
      ];
      Object.values(orders).forEach(async (order: object) => {
        const orderCartNameMeta = order.meta_data.find(
          (meta: { key: string }) => meta.key === "cart_name"
        );
        const orderCartName =
          orderCartNameMeta && orderCartNameMeta.value
            ? orderCartNameMeta.value
            : "U";

        let cartStore = cartManagerStore.getCartStoreById(order.id);
        if (!cartStore) {
          cartStore = cartManagerStore.getCartStoreByName(orderCartName);
        }
        // In case we got the cartStore by name and accidentally got one that belongs to another order
        if (cartStore.hasItems && cartStore.orderId !== order.id) {
          cartStore = useDynamicCartStore(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            cartManagerStore.createCart(orderCartName)!.key
          );
        }

        if (!cartStore.isDirty) {
          if (order.status === "completed" && cartStore.autoClose) {
            cartStore.clearCart();
            return;
          }
          cartStore.hydrateOrderData(order);

          if (cartStore.pending_bill_print) {
            await new PrintCommand("bill", cartStore).execute();
          }

          if (cartStore.pending_kot_print) {
            await new PrintCommand("kot", cartStore).execute();
          }
        }
      });

      // Load again after 10 seconds
      setTimeout(() => {
        this.loadOpenOrders();
      }, 10000);
    },
  },

  async mounted() {
    this.loadOpenOrders();
  },
});
</script>

<style>
@media print {
  .v-overlay {
    display: none !important;
  }
}
#print-area > * {
  width: 100%;
}
</style>
