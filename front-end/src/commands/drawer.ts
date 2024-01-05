import type { Command } from "./command";
import { usePrintStore } from "@/stores/print";

export default class implements Command {
  parse(command: string): boolean {
    if (["drawer", "d"].includes(command.trim())) {
      return true;
    }

    return false;
  }

  async execute() {
    const printStore = usePrintStore();
    printStore.push("drawer", null);
  }
}
