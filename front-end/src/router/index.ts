import { createRouter, createWebHashHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import ReportView from "../views/ReportView.vue";
import SettingsView from "../views/SettingsView.vue";
import { hasConfig } from "@/utils/config";

function requiresSettings(to) {
  if (!hasConfig) {
    return { name: 'settings' };
  }
}

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
      beforeEnter: requiresSettings,
    },
    {
      path: "/report",
      name: "report",
      component: ReportView,
      beforeEnter: requiresSettings,
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
    },
    {
      path: '/:id',
      name: 'order',
      component: HomeView,
    },
  ],
});

export default router;
