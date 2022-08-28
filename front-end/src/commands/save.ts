import type { Command } from "./command";
import { useCartStore } from "../stores/cart";

export default class implements Command {
  parse(command: string): boolean {
    return ["save", "up"].includes(command);
  }

  async execute(): Promise<void> {
    const cartStore = useCartStore();

    await cartStore.saveOrder();
  }
}
