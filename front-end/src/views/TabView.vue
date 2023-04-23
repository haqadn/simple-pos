<template>
  <div class="d-flex fill-height">
    <div>
      <item-list class="ma-4" type="controllable" />
    </div>
    <tab-shopping-cart />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

// Components
import TabShoppingCart from "@/components/TabShoppingCart.vue";
import ItemList from "@/components/ItemList.vue";

export default defineComponent({
  name: "HomeView",

  components: {
    TabShoppingCart,
    ItemList,
  },
});
</script>
