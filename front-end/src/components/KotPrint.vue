<template>
  <div>
    <header>
      <p class="text-h2 font-weight-black text-right">{{ cartName }}</p>
      <p class="text-h5 text-bold" v-if="orderId">Order# {{ orderId }}</p>
    </header>
    <main>
      <v-table>
        <thead>
          <tr>
            <td>Item</td>
            <td class="text-right">Quantity</td>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cartItem in filteredCartItems" :key="cartItem.id">
            <td>
              {{ cartItem.name }}
            </td>
            <td>
              {{ cartItem.quantity }}
            </td>
          </tr>
        </tbody>
      </v-table>
    </main>
  </div>
</template>

<script lang="ts">
import { mapActions, mapState } from "pinia";
import { useCartStore } from "../stores/cart";
import { useItemStore } from "../stores/items";

export default {
  data: () => ({
    currency: "৳",
    coupon: {
      name: "",
      type: "percent",
      amount: 0,
    },
  }),
  computed: {
    ...mapState(useCartStore, ["items", "orderId", "customerNote", "cartName"]),

    filteredCartItems() {
      return Object.values(this.items).filter(
        (item) =>
          item.quantity > 0 &&
          this.shouldSkipProductFromKot(item.product_id) === false
      );
    },
  },
  methods: {
    ...mapActions(useItemStore, ["shouldSkipProductFromKot"]),
  },
};
</script>

<style scoped>
* {
  color: black !important;
  word-break: keep-all;
}
header {
  text-align: center;
}

tbody tr td {
  border-bottom: 2px solid black !important;
}

tr td:last-child {
  text-align: right;
}
</style>
