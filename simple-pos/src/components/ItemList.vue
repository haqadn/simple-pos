<template>
  <v-row>
    <v-col v-for="item in items" :key="item.id">
      <v-card min-width="200" @click="() => addToCart(item)">
        <v-card-text>
          <p class="text-h5 text--primary">{{ item.name }}</p>
          <p class="text-disabled">{{ item.sku }}</p>
          <div class="text--primary">{{ item.price }}</div>
        </v-card-text>
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
