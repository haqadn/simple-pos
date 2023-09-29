<template>
  <div>
    <v-text-field
      outlined
      dense
      :value="item.quantity"
      max-width="100"
      prepend-icon="mdi-minus"
      append-icon="mdi-plus"
      @click:prepend="() => reduceFromCart(product)"
      @click:append="() => addToCart(product)"
      @input="event => setItemQuantity(product, event.target.value)"
      class="text-center"
      hide-details="auto"
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
      return this.items.find((product) => product.id === this.item.product_id);
    },
  },
};
</script>

<style scoped>
div {
  max-width: 150px;
}
</style>
