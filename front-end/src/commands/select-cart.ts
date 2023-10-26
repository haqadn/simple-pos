import type { Command } from "./command";
import { useCartManagerStore } from "../stores/cart";

export default class implements Command {
  private index;
  parse(command: string): boolean {
    const parts = command.split(" ");

    if (["c", "cart"].includes(parts[0]) && parts.length === 2) {
      this.index = parseInt(parts[1]) - 1; // Convert to zero-based array index
      return true;
    }
  }

  async execute(): Promise<void> {
    const cartManagerStore = useCartManagerStore();

    await cartManagerStore.selectCart(this.index);
  }
}
