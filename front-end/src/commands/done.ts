import type { Command } from "./command";
import { useCartManagerStore, useCartStore } from "../stores/cart";
import { alertAsync } from "@/stores/alerts";
import PrintCommand from "./print";

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
      alertAsync(
        "Payment amount must be greater than or equal to the total amount"
      );
      return false;
    }
    this.amount = amount;
    return true;
  }

  async execute(): Promise<void> {
    const cartStore = useCartStore();
    const cartManagerStore = useCartManagerStore();

    cartStore.addCartPayment(this.amount);
    cartManagerStore.showDrawerDialog();
    const printCommand = new PrintCommand("drawer");
    await printCommand.execute();
  }
}
