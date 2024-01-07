import { createRouter, createWebHashHistory } from "vue-router";
import HomeView from "@/views/HomeView.vue";
import IframeView from "@/views/IframeView.vue";
import PosView from "@/views/PosView.vue";
import ReportView from "@/views/ReportView.vue";
import SettingsView from "@/views/SettingsView.vue";
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
      children: [
        {
          path: "/:cart",
          name: "cart",
          component: PosView,
        },
        {
          path: "/shortcut/:url",
          name: "shortcut",
          component: IframeView,
        },
      ],
    },
    {
      path: "/report",
      name: "report",
      component: ReportView,
      beforeEnter: requiresSettings,
    },
    {
      path: "/settings",
      name: "settings",
      component: SettingsView,
    },
  ],
});

export default router;
