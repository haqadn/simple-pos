import { createRouter, createWebHashHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import TabView from "../views/TabView.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/tablet",
      name: "tablet",
      component: TabView,
    },
    {
      path: '/:id',
      name: 'order',
      component: HomeView,
    },
  ],
});

export default router;
