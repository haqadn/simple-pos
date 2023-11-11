import type { Meta, StoryObj } from '@storybook/vue3';

import BillPrint from '../components/BillPrint.vue';

// More on how to set up stories at: https://storybook.js.org/docs/vue/writing-stories/introduction
const meta: Meta<typeof BillPrint> = {
  title: 'Components/Print/Bill',
  component: BillPrint,
  // This component will have an automatically generated docsPage entry: https://storybook.js.org/docs/vue/writing-docs/autodocs
  tags: ['autodocs'],
  parameters: {
    viewport: {
        viewports: {
          print: {
            name: 'POS Printer',
            styles: {
              width: '80mm',
              height: '200mm',
            },
          },
        }
      }
  },
};

export default meta;
type Story = StoryObj<typeof BillPrint>;
/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/vue/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'print',
    },
  },
};