<template>
  <shopping-cart />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

// Components
import ShoppingCart from "@/components/ShoppingCart.vue";

export default defineComponent({
  name: 'HomeView',

  components: {
    ShoppingCart
  },
});
</script>
