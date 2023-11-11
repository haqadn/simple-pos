import { type Preview, setup }  from '@storybook/vue3';
import type { App } from 'vue';
import { createPinia } from 'pinia';
import vuetify from "../src/plugins/vuetify";

const pinia = createPinia();

setup((app: App) => {
    app.use(pinia);
    app.use(vuetify)
});


const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
