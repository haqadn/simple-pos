import type { Meta, StoryObj } from "@storybook/vue3";

import BillPrint from "@/components/BillPrint.vue";
import type { LineItem, Product } from "@/types";

// More on how to set up stories at: https://storybook.js.org/docs/vue/writing-stories/introduction
const meta: Meta<typeof BillPrint> = {
  title: "Components/Print/Bill",
  component: BillPrint,
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
    customerName: { control: "text" },
    customerPhone: { control: "text" },
    lineItems: { control: "text" },
    orderTime: { control: "date" },
    payment: { control: "number" },
    discountTotal: { control: "number" },
    orderId: { control: "number" },
  },
};

const defaultArgs = {
  cartName: "T 6",
  customerName: "Nguyen Van A",
  customerPhone: "0123456789",
  lineItems: `Naga Chicken Wings| 1| 180\nWater| 2| 20\nCrispy Chicken Burger| 2| 165\nBBQ Chicken Pizza 10"| 1| 700`,
  orderTime: new Date(),
  payment: 1500,
  discountTotal: 0,
  orderId: 9991,
};

const parseLineItems = (
  lineItemsText: string
): { products: Product[]; lineItems: LineItem[] } => {
  let id = 1;
  const productsAndLineItems = lineItemsText.split("\n").map((lineItem) => {
    const [name, quantity, price] = lineItem
      .split("|")
      .map((item) => item.trim());
    return {
      product: {
        id: ++id,
        name,
        price: parseInt(price),
        sku: id.toString(),
      } as Product,
      lineItem: {
        product_id: id,
        line_item_id: id,
        quantity: parseInt(quantity),
        price: parseInt(price),
        name,
      } as LineItem,
    };
  });
  const products = productsAndLineItems.map((item) => item.product);
  const lineItems = productsAndLineItems.map((item) => item.lineItem);

  return { products, lineItems };
};

export default meta;

type Story = StoryObj<typeof BillPrint>;
/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
  render: (args) => {
    console.log({ args });
    return {
      components: { BillPrint },
      setup() {
        const itemsMap: { [id: number]: LineItem } = {};
        const { lineItems } = parseLineItems(defaultArgs.lineItems);
        lineItems.forEach((li) => {
          if (li.quantity > 0) {
            itemsMap[li.product_id] = li;
          }
        });

        return {
          args: {
            cartName: args.cartName,
            customer: {
              name: args.customerName,
              phone: args.customerPhone,
            },
            items: itemsMap,
            orderTime: args.orderTime,
            payment: args.payment,
            discountTotal: args.discountTotal,
            invoiceNumber: args.orderId,
          },
        };
      },
      template: '<bill-print v-bind="args" />',
    };
  },
  args: defaultArgs,
};
