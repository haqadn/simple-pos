<template>
  <div>
    <v-btn
      v-for="(cartReference, index) in cartsWithMeta"
      :key="cartReference.key"
      :to="`/${cartReference.key}`"
      :color="getCartBtnColor(cartReference)"
      class="ma-2"
      :variant="getCartBtnVariant(cartReference)"
    >
      <template v-slot:prepend>
        <v-chip size="x-small">{{ index + 1 }}</v-chip>
      </template>
      {{ cartReference.label }}
    </v-btn>
    <new-cart class="ma-2 d-lg-none" />
    <new-cart class="ma-2 d-none d-lg-block w-100" />
    <v-btn class="ma-2 d-lg-none" @click="refresh">
      <v-icon>mdi-refresh</v-icon>
    </v-btn>
    <v-btn class="ma-2 d-none d-lg-block w-100" @click="refresh">
      <v-icon>mdi-refresh</v-icon>
    </v-btn>
  </div>
</template>

<script lang="ts">
import {
  type CartRef,
  useCartManagerStore,
  useDynamicCartStore,
} from "@/stores/cart";
import { mapState } from "pinia";
import { defineComponent } from "vue";
import NewCart from "./NewCart.vue";

export default defineComponent({
  name: "CartList",

  components: {
    NewCart,
  },

  computed: {
    ...mapState(useCartManagerStore, ["cartsWithMeta", "activeCartReference"]),
  },

  methods: {
    refresh() {
      window.location.reload();
    },
    getCartBtnVariant(cartReference: CartRef) {
      if (this.activeCartReference === cartReference.key) {
        return "elevated";
      }

      if (cartReference.meta?.hasItems) {
        return "outlined";
      }

      return "flat";
    },
    getCartBtnColor(cartReference: CartRef) {
      if (cartReference.meta?.hasIssue) {
        return "warning";
      }

      const cartStore = useDynamicCartStore(cartReference.key);
      if (cartStore.status === "completed") {
        return "success";
      }

      if (this.activeCartReference === cartReference.key) {
        return "primary";
      }

      return "default";
    },
  },
});
</script>
