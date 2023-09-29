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

  async execute(): Promise<void> {
    const cartStore = useCartStore();
    const itemStore = useItemStore();

    if (cartStore.coupons.length > 0) {
      // Recalculate cart
      await cartStore.saveOrder();
    }

    cartStore.addCartPayment(this.amount);
    // Mark order as paid
    await cartStore.saveOrder();

    const confirmation = confirm("Item saved. Clear cart and continue?");
    if (confirmation) {
      cartStore.clearCart();
      itemStore.loadItems();
    }
  }
}
