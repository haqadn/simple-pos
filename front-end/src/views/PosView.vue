<template>
  <v-container fluid>
    <v-row class="d-print-none">
      <v-col cols="12" lg="8">
        <command-input />
        <item-list class="d-none d-lg-block" />
      </v-col>
      <v-col cols="12" lg="4">
        <drawer-dialog />
        <shopping-cart />
      </v-col>
    </v-row>
    <v-row>
      <thermal-print />
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from "vue";

// Components
import ShoppingCart from "@/components/ShoppingCart.vue";
import DrawerDialog from "@/components/DrawerDialog.vue";
import ItemList from "@/components/ItemList.vue";
import CommandInput from "@/components/CommandInput.vue";
import { useCartManagerStore } from "@/stores/cart";
import { mapActions } from "pinia";
import OpenOrder from "@/commands/open-order";
import ThermalPrint from "../components/ThermalPrint.vue";

export default defineComponent({
  name: "PosView",

  components: {
    ShoppingCart,
    ItemList,
    CommandInput,
    DrawerDialog,
    ThermalPrint,
  },

  methods: {
    ...mapActions(useCartManagerStore, ["setActiveCart"]),

    openOrder(orderId: string) {
      new OpenOrder(orderId, true).execute();
    },
  },

  beforeRouteUpdate(to) {
    const cartManagerStore = useCartManagerStore();
    if (to.params.cart) {
      cartManagerStore.setActiveCart(to.params.cart as string);
    }
  },

  beforeRouteEnter(to) {
    const cartManagerStore = useCartManagerStore();
    if (to.params.cart) {
      cartManagerStore.setActiveCart(to.params.cart as string);
    }
  },

});
</script>

<style>
#print-area > * {
  width: 100%;
}
</style>
