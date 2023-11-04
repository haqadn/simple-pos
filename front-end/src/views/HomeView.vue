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
import NewCart from "../components/NewCart.vue";
import config from "../utils/config";

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
    ]),

    printWidth() {
      return config.printWidth;
    },
  },

  methods: {
    ...mapActions(useCartManagerStore, ["setActiveCart", "hideDrawerDialog"]),
    ...mapActions(useCartStore, ["clearCart"]),

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
  },

  async mounted() {
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
});
</script>

<style>
#print-area > * {
  width: 100%;
}
</style>
