import type { Command } from "./command";
import { useItemStore } from "../stores/items";
import { useCartStore } from "../stores/cart";

export default class implements Command {
  private amount!: number;

  parse(command: string): boolean {
    const cartStore = useCartStore();
    const parts = command.split(" ");

    if (["done", "dn"].includes(parts[0]) && parts.length >= 1) {
      if (parts.length === 1) {
        return this.setAmount(cartStore.total);
      } else {
        return this.setAmount(parseFloat(parts[1]));
      }
    }

    return false;
  }

  public setAmount(amount: number) {
    const cartStore = useCartStore();
    if (cartStore.total > amount) {
      alert("Payment amount must be greater than or equal to the total amount");
      return false;
    }
    this.amount = amount;
    return true;
  }

  private printReceipt() {
    return new Promise<void>((resolve) => {
      window.onafterprint = (e) => {
        window.onafterprint = null;
        resolve();
      };
      window.print();
    });
  }

  async execute(): Promise<void> {
    const cartStore = useCartStore();
    const itemStore = useItemStore();

    // If there is a coupon, recalculate then save the order
    if (cartStore.coupons.length > 0) {
      // Save for recalculation
      await cartStore.saveOrder();
      cartStore.addCartPayment(this.amount);

      // Save again for marking paid
      await Promise.all([cartStore.saveOrder(), this.printReceipt()]);
    } else {
      cartStore.addCartPayment(this.amount);
      await cartStore.saveOrder();
      await this.printReceipt();
    }
    itemStore.loadItems();
    cartStore.clearCart();
  }
}
