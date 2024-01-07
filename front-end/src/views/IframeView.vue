<template>
  <v-container fluid class="h-screen my-n8">
    <iframe
      :src="url"
      width="100%"
      height="100%"
      frameborder="0"
      allowfullscreen
    ></iframe>
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "IframeView",

  computed: {
    url() {
      return this.$route.params.url as string;
    },
  },
});
</script>
