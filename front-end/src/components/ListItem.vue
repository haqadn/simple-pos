<template>
  <v-card
    :color="color"
    :theme="cartItem ? 'dark' : 'lite'"
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
    ...mapState(useCartStore, ["line_items"]),
    cartItem() {
      return this.line_items.find(
        (item) =>
          item.variation_id === this.item.id || item.product_id === this.item.id
      );
    },
    color() {
      if (this.cartItem && this.cartItem.quantity > 0) {
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
