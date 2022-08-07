<template>
  <v-container fluid>
    <v-row class="d-print-none">
      <v-col cols="8">
        <command-input/>
        <item-list />
      </v-col>
      <v-col cols="4">
        <shopping-cart />
      </v-col>
    </v-row>
    <v-row class="d-print-block">
      <printable-shopping-cart />
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from "vue";

// Components
import ShoppingCart from "@/components/ShoppingCart.vue";
import PrintableShoppingCart from "@/components/PrintableShoppingCart.vue";
import ItemList from "@/components/ItemList.vue";
import CommandInput from "@/components/CommandInput.vue";

export default defineComponent({
  name: "HomeView",

  components: {
    ShoppingCart,
    ItemList,
    CommandInput,
    PrintableShoppingCart,
  },
});
</script>
