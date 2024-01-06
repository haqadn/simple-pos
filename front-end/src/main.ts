import { createApp, markRaw } from "vue";
import App from "./App.vue";
import router from "./router";
import vuetify from "./plugins/vuetify";
import { loadFonts } from "./plugins/webfontloader";
import { createPinia } from "pinia";
loadFonts();

const pinia = createPinia();
pinia.use(({ store }) => {
  store.$router = markRaw(router);
});

createApp(App).use(router).use(vuetify).use(pinia).mount("#pos-app");

window.addEventListener("visibilitychange", function () {
  console.log("Visibility changed");
  if (document.visibilityState === "visible") {
    console.log("APP resumed");
    window.location.reload();
  }
});
