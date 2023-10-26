<template>
  <v-container fluid>
    <v-row class="d-print-none">
      <v-col cols="1">
        <v-btn
          v-for="(cartReference, index) in carts"
          :key="cartReference.key"
          @click="setActiveCart(cartReference.key)"
          :color="activeCartReference === cartReference.key ? 'primary' : ''"
          class="mb-2 w-100"
          :elevated="activeCartReference === cartReference.key"
          :flat="activeCartReference !== cartReference.key"
        >
          <template v-slot:prepend>
            <v-chip>{{ index + 1 }}</v-chip>
          </template>
          {{ cartReference.label }}
        </v-btn>
        <v-btn @click="createCart()" class="w-100 mb-2"> + </v-btn>
      </v-col>
      <v-col cols="7">
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
import { useCartStore, useCartManagerStore } from "@/stores/cart";
import { mapActions, mapState } from "pinia";

export default defineComponent({
  name: "HomeView",

  components: {
    ShoppingCart,
    ItemList,
    CommandInput,
    PrintableShoppingCart,
  },

  computed: {
    ...mapState(useCartManagerStore, ["activeCartReference", "carts"]),
  },

  methods: {
    ...mapActions(useCartManagerStore, ["setActiveCart", "createCart"]),
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
