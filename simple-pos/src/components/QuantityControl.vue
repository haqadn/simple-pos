<template>
  <div>
    <v-text-field
      outlined
      dense
      :value="item.quantity"
      max-width="100"
      prepend-icon="mdi-minus"
      append-icon="mdi-plus"
      @click:prepend="() => reduceFromCart(item)"
      @click:append="() => addToCart(item)"
      @input="event => input(event.target.value)"
      class="text-center"
      hide-details="auto"
    ></v-text-field>
  </div>
</template>

<script>
import { mapActions } from "pinia";
import { useCartStore } from "../stores/cart";

export default {
  props: ["item"],
  methods: {
    ...mapActions(useCartStore, ["addToCart", "reduceFromCart"]),

    input(value) {
      const diff = parseInt(value) - this.item.quantity;
      if (diff > 0) {
        this.addToCart(this.item, diff);
      } else if (diff < 0) {
        this.reduceFromCart(this.item, -diff);
      }
    },
  },
};
</script>

<style scoped>
div {
  max-width: 150px;
}
</style>
