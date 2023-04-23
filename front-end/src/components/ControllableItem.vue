<template>
  <v-card variant="outlined" :color="color" theme="dark" min-width="200">
    <v-card-title>
      {{ item.name }}
    </v-card-title>
    <v-card-actions>
      <v-chip class="ma-2" color="green" label text-color="white">
        <v-icon start icon="mdi-cash"></v-icon>
        {{ item.price }}
      </v-chip>
      <v-chip class="ma-2" color="pink" label text-color="white">
        <v-icon start icon="mdi-cart"></v-icon>
        {{ cartItems[item.id] ? cartItems[item.id].quantity : 0 }}
      </v-chip>
      <v-spacer></v-spacer>
      <v-btn
        @click="reduceFromCart(item)"
        icon="mdi-minus"
        variant="outlined"
      ></v-btn>
      <v-btn
        @click="addToCart(item)"
        icon="mdi-plus"
        variant="outlined"
      ></v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useCartStore } from "../stores/cart";

export default {
  methods: {
    ...mapActions(useCartStore, [
      "addToCart",
      "reduceFromCart",
      "setItemQuantity",
    ]),
  },
  props: {
    item: {
      type: Object,
      required: true,
    },
  },
  computed: {
    ...mapState(useCartStore, {
      cartItems: "items",
    }),
    color() {
      if (
        this.cartItems[this.item.id] &&
        this.cartItems[this.item.id].quantity > 0
      ) {
        return "success";
      }

      if (this.item.manage_stock) {
        if (this.item.stock_quantity <= 0) {
          return "error";
        }
        if (this.item.stock_quantity <= this.item.low_stock_amount) {
          return "warning";
        }
      }

      return "";
    },
  },
};
</script>
