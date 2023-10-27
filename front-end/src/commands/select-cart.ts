import type { Command } from "./command";
import { useCartManagerStore } from "../stores/cart";

export default class implements Command {
  private index = 0;
  private createNew = false;
  private newCartLabel?: string;

  parse(command: string): boolean {
    const parts = command.split(" ");

    if (["c", "cart"].includes(parts[0]) && parts.length >= 2) {
      if (parts[1] === "new") {
        this.createNew = true;
        this.newCartLabel = parts.splice(2).join(" ");
      } else {
        this.index = parseInt(parts[1]) - 1; // Convert to zero-based array index
      }
      return true;
    }
    return false;
  }

  async execute(): Promise<void> {
    const cartManagerStore = useCartManagerStore();

    if (this.createNew) {
      cartManagerStore.createCart(this.newCartLabel);
      return;
    }
    await cartManagerStore.selectCart(this.index);
  }
}
