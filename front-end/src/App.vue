<template>
  <v-app>
    <v-main>
      <home-view></home-view>
    </v-main>
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import HomeView from "./views/HomeView.vue";

export default defineComponent({
  name: "App",

  components: {
    HomeView,
  },

  data() {
    return {
      //
    };
  },
});
</script>
