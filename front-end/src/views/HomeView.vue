<template>
  <v-container fluid>
    <v-row class="d-print-none">
      <v-col cols="8">
        <command-input />
        <item-list />
      </v-col>
      <v-col cols="4">
        <shopping-cart />
      </v-col>
    </v-row>
    <v-row class="d-print-block d-none">
      <printable-shopping-cart />
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from "vue";

// Components
import ShoppingCart from "@/components/ShoppingCart.vue";
import PrintableShoppingCart from "@/components/PrintableShoppingCart.vue";
import ItemList from "@/components/ItemList.vue";
import CommandInput from "@/components/CommandInput.vue";
import { useCartStore } from "@/stores/cart";

export default defineComponent({
  name: "HomeView",

  components: {
    ShoppingCart,
    ItemList,
    CommandInput,
    PrintableShoppingCart,
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
