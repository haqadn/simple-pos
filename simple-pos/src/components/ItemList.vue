<template>
  <v-row>
    <v-col v-for="item in items" :key="item.id">
      <v-card
        :color="cartItems[item.id] ? 'success' : ''"
        :theme="cartItems[item.id] ? 'dark' : 'lite'"
        min-width="200"
        @click="() => addToCart(item)"
      >
        <v-card-title>{{ item.name }}</v-card-title>
        <v-card-subtitle>{{ item.sku }}</v-card-subtitle>
        <v-card-text>{{ item.price }}</v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useItemStore } from "../stores/items";
import { useCartStore } from "../stores/cart";

export default {
  data: () => ({
    reveal: false,
  }),
  methods: {
    ...mapActions(useCartStore, ["addToCart"]),
  },
  computed: {
    ...mapState(useCartStore, {
      cartItems: 'items'
    }),
    ...mapState(useItemStore, ["items"]),
  },
};
</script>

<style>
.v-card--reveal {
  bottom: 0;
  opacity: 1 !important;
  position: absolute;
  width: 100%;
}
</style>
