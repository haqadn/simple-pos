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
              <span class="old quantity"
                v-if="
                  cartItem.quantity !==
                    previousQuantities[cartItem.product_id] &&
                  previousQuantities[cartItem.product_id] !== undefined
                "
                >{{ previousQuantities[cartItem.product_id] }}</span
              >
              <span
                class="quantity"
                :class="{
                  changed:
                    cartItem.quantity !==
                    previousQuantities[cartItem.product_id],
                }"
              >
                {{ cartItem.quantity }}
              </span>
            </td>
          </tr>
        </tbody>
      </v-table>
    </main>
    <div class="ma-4">
      {{ customerNote }}
    </div>
  </div>
</template>

<script lang="ts">
import { mapState, mapActions } from "pinia";
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
    ...mapState(useCartStore, [
      "items",
      "orderId",
      "customerNote",
      "cartName",
      "previousKot",
    ]),

    previousQuantities() {
      try {
        const prevKotObj = JSON.parse(this.previousKot);

        return prevKotObj.reduce(
          (
            acc: { [pid: number]: number },
            item: { product_id: number; quantity: number }
          ) => {
            acc[item.product_id] = item.quantity;
            return acc;
          },
          {}
        );
      } catch (e) {
        return {};
      }
    },

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

.quantity {
  display: inline-block;
  padding: 4px;
  min-width: 1em;
  margin-left: 4px;
}

.changed {
  border: 1px solid black;
  border-radius: 100%;
  min-width: 1em;
  margin-left: 4px;
}

.old {
  text-decoration: line-through;
}
</style>
