<template>
  <v-card
    :color="color"
    :theme="cartItems[item.id] ? 'dark' : 'lite'"
    min-width="200"
    @click="() => addToCart(item)"
  >
    <v-card-title>{{ item.name }}</v-card-title>
    <v-card-subtitle>
      {{ item.sku }}
      <span v-if="item.manage_stock">( {{ item.stock_quantity }} )</span>
    </v-card-subtitle>
    <v-card-text>{{ item.price }}</v-card-text>
  </v-card>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useCartStore } from "../stores/cart";

export default {
  methods: {
    ...mapActions(useCartStore, ["addToCart", "loadOrder"]),
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
