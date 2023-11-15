import type { Command } from "./command";
import { useCartManagerStore } from "../stores/cart";

export default class implements Command {
  private indexes: Array<number> = [];

  parse(command: string): boolean {
    const parts = command.split(" ");

    // Moving current cart to the specified one
    if (["move"].includes(parts[0]) && parts.length == 2) {
      this.indexes = [parseInt(parts[1]) - 1];
      return true;
    }

    if (["move"].includes(parts[0]) && parts.length >= 3) {
      this.indexes = parts.splice(1).map((index) => parseInt(index) - 1);
      return true;
    }
    return false;
  }

  async execute(): Promise<void> {
    const cartManagerStore = useCartManagerStore();
    cartManagerStore.rotateCarts(this.indexes);
  }
}
