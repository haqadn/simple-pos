<template>
  <v-app>
    <alert-dialog />
    <confirm-dialog />
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import AlertDialog from "./components/AlertDialog.vue";
import ConfirmDialog from "./components/ConfirmDialog.vue";

export default defineComponent({
  components: { AlertDialog, ConfirmDialog },
  name: "App",

  data() {
    return {
      //
    };
  },
});
</script>
