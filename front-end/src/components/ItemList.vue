<template>
  <div>
    <v-row class="mb-4">
      <v-btn-group class="flex-wrap">
        <v-btn @click="tab = 'popular'">Popular</v-btn>
        <v-btn @click="tab = 'all'">All</v-btn>
        <v-btn
          @click="tab = category.id"
          v-for="category in categories.filter((cat) => cat.count > 0)"
          :key="category.id"
        >
          <span v-html="category.name"></span>
        </v-btn>
      </v-btn-group>
    </v-row>
    <v-row v-if="tab === 'popular'">
      <v-col v-for="item in popularProducts" :key="item.id">
        <controllable-item v-if="type === 'controllable'" :item="item" />
        <list-item v-else :item="item" />
      </v-col>
    </v-row>
    <v-row v-for="category in visibleCategories" :key="category.id">
      <v-col class="v-col-12">
        <h4 v-html="category.name"></h4>
      </v-col>

      <v-col
        v-for="item in items
          .filter((item) => item.categories[0].id === category.id)
          .sort((a, b) => {
            if (a.menu_order !== b.menu_order) {
              return a.menu_order > b.menu_order ? 1 : -1;
            }

            return a.price > b.price ? 1 : -1;
          })"
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
    tab: "popular",
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

    visibleCategories() {
      if (this.tab === "all") {
        return this.categories.filter((cat) => cat.count > 0);
      }

      return this.categories.filter((cat) => cat.id === this.tab);
    },

    popularProducts() {
      const items = [...this.items];
      return items.slice(0, 10);
    },
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
