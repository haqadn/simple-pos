import type { Meta, StoryObj } from "@storybook/vue3";

import KotPrint from "@/components/KotPrint.vue";
import type { KotLineItem } from "@/types";

// More on how to set up stories at: https://storybook.js.org/docs/vue/writing-stories/introduction
const meta: Meta<typeof KotPrint> = {
  title: "Components/Print/Kot",
  component: KotPrint,
  // This component will have an automatically generated docsPage entry: https://storybook.js.org/docs/vue/writing-docs/autodocs
  tags: ["autodocs"],
  parameters: {
    viewport: {
      viewports: {
        print: {
          name: "POS Printer",
          styles: {
            width: "80mm",
            height: "200mm",
          },
        },
      },
      defaultViewport: "print", // This should match the key in 'viewports'
    },
  },
  argTypes: {
    cartName: { control: "text" },
    lineItems: { control: "text" },
    orderReference: { control: "text" },
  },
};

const defaultArgs = {
  cartName: "T 6",
  lineItems: `Naga Chicken Wings| 1| 2\nWater| 2| 1\nCrispy Chicken Burger| 2| 0\nBBQ Chicken Pizza 10"| 1| 1`,
  orderReference: "9991",
};

const parseLineItems = (lineItemsText: string): KotLineItem[] => {
  const id = 1;

  return lineItemsText.split("\n").map((lineItem) => {
    const [name, previousQuantity, quantity] = lineItem
      .split("|")
      .map((item) => item.trim());

    return {
      product_id: id,
      line_item_id: id,
      quantity: parseInt(quantity),
      previousQuantity: parseInt(previousQuantity),
      name,
    } as KotLineItem;
  });
};

export default meta;

type Story = StoryObj<typeof KotPrint>;
/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
  render: (args) => {
    console.log({ args });
    return {
      components: { KotPrint },
      setup() {
        return {
          args: {
            cartName: args.cartName,
            items: parseLineItems(args.lineItems),
            orderReference: args.orderReference,
          },
        };
      },
      template: '<kot-print v-bind="args" />',
    };
  },
  args: defaultArgs,
};
