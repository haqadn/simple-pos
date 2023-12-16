import type { Command } from "./command";
import { useCartStore } from "../stores/cart";

export default class implements Command {
  private amount!: number;

  parse(command: string): boolean {
    const parts = command.split(" ");

    if (parts[0] === "pay" && parts.length === 2) {
      this.amount = parseFloat(parts[1]);
      return true;
    }
    return false;
  }

  async execute(): Promise<void> {
    const cartStore = useCartStore();
    cartStore.addCartPayment(this.amount);
  }
}
