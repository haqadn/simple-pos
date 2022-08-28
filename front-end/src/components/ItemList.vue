<template>
  <v-row>
    <v-col v-for="item in items" :key="item.id">
      <list-item :item="item" />
    </v-col>
  </v-row>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useItemStore } from "../stores/items";
import { useCartStore } from "../stores/cart";
import ListItem from "./ListItem.vue";

export default {
  data: () => ({
    reveal: false,
  }),
  methods: {
    ...mapActions(useCartStore, ["loadOrder"]),
    ...mapActions(useItemStore, ["loadItems"]),
  },
  computed: {
    ...mapState(useCartStore, {
      cartItems: "items",
    }),
    ...mapState(useItemStore, ["items"]),
  },
  async created() {
    await this.loadItems();
    if (this.$route.params.id) {
      await this.loadOrder(this.$route.params.id);
    }
  },
  components: {
    ListItem,
  },
};
</script>
