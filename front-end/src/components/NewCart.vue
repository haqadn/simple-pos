<template>
  <v-btn @click="dialog = !dialog">
    +

    <v-dialog v-if="dialog" v-model="dialog" activator="parent" width="auto">
      <v-card class="pa-4">
        <v-text-field
          v-model="newCartName"
          label="New Cart Name"
          outlined
          dense
          autofocus
          tabindex="1"
          :hide-details="true"
          @keyup.enter="addNewCart"
        ></v-text-field>
        <v-card-actions>
          <v-btn color="default" @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="addNewCart()">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-btn>
</template>

<script lang="ts">
import { mapActions } from "pinia";
import {
  type CartRef,
  useCartManagerStore,
  useDynamicCartStore,
} from "../stores/cart";

export default {
  data() {
    return {
      dialog: false,
      newCartName: "P",
    };
  },
  methods: {
    ...mapActions(useCartManagerStore, ["createCart", "setActiveCart"]),

    addNewCart() {
      const cartRef = this.createCart(this.newCartName) as CartRef;
      this.setActiveCart(cartRef.key);
      const cartStore = useDynamicCartStore(cartRef?.key as string);
      cartStore.setupAutosave();
      this.newCartName = "P";
      this.dialog = false;
    },
  },
};
</script>
