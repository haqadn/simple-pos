import type { Command } from "./command";
import { useCartStore } from "../stores/cart";

export default class implements Command {
  private orderId!: string;

  parse(command: string): boolean {
    const parts = command.split(" ");
    if (parts[0] === "open" && parts.length === 2) {
      this.orderId = command.split(" ")[1];
      return true;
    }

    return false;
  }

  async execute(): Promise<void> {
    const cartStore = useCartStore();

    await cartStore.loadOrder(this.orderId);
  }
}
