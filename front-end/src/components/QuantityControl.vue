<template>
  <div>
    <v-text-field
      v-model="quantity"
      max-width="100"
      prepend-icon="mdi-minus"
      append-icon="mdi-plus"
      @click:prepend="() => reduceFromCart(product)"
      @click:append="() => addToCart(product)"
      class="text-center"
      hide-details="auto"
      variant="outlined"
    ></v-text-field>
  </div>
</template>

<script>
import { mapActions, mapState } from "pinia";
import { useCartStore } from "../stores/cart";
import { useItemStore } from "../stores/items";

export default {
  props: ["item"],
  methods: {
    ...mapActions(useCartStore, [
      "addToCart",
      "reduceFromCart",
      "setItemQuantity",
    ]),
  },
  computed: {
    ...mapState(useItemStore, ["items"]),

    product() {
      return this.items.find(
        (product) =>
          product.id === this.item.variation_id ||
          product.id === this.item.product_id
      );
    },

    quantity: {
      get() {
        return this.item.quantity;
      },
      set(value) {
        this.setItemQuantity(this.product, value);
      },
    },
  },
};
</script>

<style scoped>
div {
  min-width: 130px;
}
</style>
