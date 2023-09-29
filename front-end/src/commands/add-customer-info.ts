import { useCartStore } from "../stores/cart";
import type { Command } from "./command";

export default class implements Command {
  private info: Record<string, string> = { phone: "", name: "" };
  private type!: "name" | "phone" | "cus";

  parse(command: string): boolean {
    const parts = command.split(" ");
    this.type = parts[0] as "name" | "phone" | "cus";

    if (["name", "phone"].includes(parts[0]) && parts.length >= 2) {
      this.info[this.type] = parts.slice(1).join(" ");
      return true;
    }

    // Shorthand command, Ex: "cus 1234567890 John Doe"
    if (parts[0] === "cus" && parts.length >= 3) {
      this.info = {
        phone: parts[1],
        name: parts.slice(2).join(" ");
      };
      return true;
    }
    return false;
  }

  async execute(): Promise<void> {
    const cartStore = useCartStore();

    if (this.type === "cus" || this.type === "phone") {
      cartStore.addCartCustomerInfo("phone", this.info.phone);
    }
    if (this.type === "cus" || this.type === "name") {
      cartStore.addCartCustomerInfo("name", this.info.name);
    }
  }
}
