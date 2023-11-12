import type { Command } from "./command";
import { useCartStore } from "../stores/cart";

export default class implements Command {
  private orderId!: string;

  parse(command: string): boolean {
    const parts = command.split(" ");
    if (parts[0] == "open" && parts[1] === "i" && parts.length === 3) {
      const orderRef = command.split(" ")[2];
      const orderId = parseInt(orderRef.slice(0, -2)) + parseInt(orderRef.slice(-2));
      this.orderId = orderId.toString();
      return true;
    }
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
