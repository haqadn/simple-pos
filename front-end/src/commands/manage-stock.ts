import type { Command } from "./command";
import { useItemStore } from "../stores/items";
import ProductsAPI from "@/api/products";

export default class implements Command {
  private item!: any;
  private action!: "add" | "set" | "rm";
  private quantity!: number;

  parse(command: string): boolean {
    const parts = command.split(" ");
    if (parts[0] !== "stock" || parts.length !== 4) {
      console.log('Command "stock" expects "stock <action> <quantity> <sku>"');
      return false;
    }

    const sku = parts[2];

    const itemStore = useItemStore();
    this.item = itemStore.items.find((item) => item.sku === sku);
    if (!this.item) {
      console.log(`Item with SKU ${sku} not found`);
      return false;
    }

    if (!["add", "set", "rm"].includes(parts[1])) {
      console.log(`Invalid action: ${parts[1]}`);
      return false;
    } else {
      this.action = parts[1] as "add" | "set" | "rm";
    }

    this.quantity = parseInt(parts[3]);

    return true;
  }

  async execute(): Promise<void> {
    const itemStore = useItemStore();

    // Just do an initial refresh
    const data = { manage_stock: true, stock_quantity: this.quantity };

    if (this.action === "add") {
      await itemStore.loadItems();
      data.stock_quantity = this.quantity + this.item.stock_quantity;
    }
    if (this.action === "rm") {
      await itemStore.loadItems();
      data.stock_quantity = this.item.stock_quantity - this.quantity;
    }

    await ProductsAPI.updateProduct(this.item.id, data);
    await itemStore.loadItems();
  }
}
