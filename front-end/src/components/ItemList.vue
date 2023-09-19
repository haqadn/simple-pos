<template>
  <div>
    <v-row v-for="category in categories" :key="category.id">
      <v-col class="v-col-12">
        <h4>{{ category.name }}</h4>
      </v-col>

      <v-col
        v-for="item in items.filter(
          (item) => item.categories[0].id === category.id
        )"
        :key="item.id"
      >
        <controllable-item v-if="type === 'controllable'" :item="item" />
        <list-item v-else :item="item" />
      </v-col>
    </v-row>
  </div>
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
    ...mapActions(useItemStore, ["loadItems", "loadCategories"]),
  },
  computed: {
    ...mapState(useCartStore, {
      cartItems: "items",
    }),
    ...mapState(useItemStore, ["items", "categories"]),
  },
  async created() {
    await Promise.all([this.loadItems(), this.loadCategories()]);

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
