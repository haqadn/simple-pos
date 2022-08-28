import type { Command } from "./command";
import { useCartStore } from "../stores/cart";

export default class implements Command {
  private code!: string;

  parse(command: string): boolean {
    const parts = command.split(" ");

    if (parts[0] === "coupon" && parts.length === 2) {
      this.code = parts[1];
      return true;
    }
    return false;
  }

  async execute(): Promise<void> {
    const cartStore = useCartStore();

    await cartStore.addCoupon(this.code);
  }
}
