<template>
  <v-row>
    <v-col v-for="item in items" :key="item.id">
      <controllable-item v-if="type === 'controllable'" :item="item" />
      <list-item v-else :item="item" />
    </v-col>
  </v-row>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useItemStore } from "../stores/items";
import { useCartStore } from "../stores/cart";
import ListItem from "./ListItem.vue";
import ControllableItem from "./ControllableItem.vue";

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
    ControllableItem,
  },
  props: {
    type: {
      type: String,
      default: "clickable",
    },
  },
};
</script>
