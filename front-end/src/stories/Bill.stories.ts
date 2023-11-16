import type { Meta, StoryObj } from '@storybook/vue3';

import BillPrint from '../components/BillPrint.vue';
import { useCartStore } from '@/stores/cart';
import { watchEffect } from 'vue';
import type { LineItem, Product } from '@/types';
import { useItemStore } from '@/stores/items';

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
      },
      defaultViewport: 'print', // This should match the key in 'viewports'
    }
  },
  argTypes: {
    cartName: { control: 'text' },
    customerName: { control: 'text' },
    customerPhone: { control: 'text' },
    lineItems: { control: 'text' },
    orderTime: { control: 'date' },
    payment: { control: 'number' },
    discountTotal: { control: 'number' },
    orderId: { control: 'number' },
  },
  args: {
    cartName: 'T 6',
    customerName: 'Nguyen Van A',
    customerPhone: '0123456789',
    lineItems: `Naga Chicken Wings| 1| 180\nWater| 2| 20\nCrispy Chicken Burger| 2| 165\nBBQ Chicken Pizza 10"| 1| 700`,
    orderTime: new Date(),
    payment: 1500,
    discountTotal: 0,
    orderId: 9991,
  },
};

const parseLineItems = (lineItemsText: string): {products: Product[], lineItems: LineItem[]} => {
  let id = 1;
  const productsAndLineItems = lineItemsText.split('\n').map((lineItem) => {
    const [name, quantity, price] = lineItem.split('|').map((item) => item.trim());
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

  return {products, lineItems};
}

export default meta;
type Story = StoryObj<typeof BillPrint>;
type ArgTypes = typeof meta.argTypes;
/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/vue/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = (args: ArgTypes) => ({
  components: { BillPrint },
  setup() {
    const cartStore = useCartStore();

    // Use watchEffect to respond to changes in args.cartName
    watchEffect(() => {
      cartStore.setCartName(args.cartName);
      cartStore.customer = {
        name: args.customerName,
        phone: args.customerPhone,
      };
      cartStore.orderId = args.orderId;
      cartStore.orderIdSalt = Math.floor(Math.random() * 90) + 10;
      const { products, lineItems } = parseLineItems(args.lineItems);
      cartStore.line_items = lineItems;
      cartStore.orderTime = args.orderTime.toLocaleString();
      cartStore.payment = args.payment;
      cartStore.discountTotal = args.discountTotal;

      const itemsStore = useItemStore();
      itemsStore.items = products;
    });
    return {};
  },
  template: '<bill-print />'
});