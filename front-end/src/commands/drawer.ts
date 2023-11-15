import { useCartManagerStore } from "@/stores/cart";
import type { Command } from "./command";
import { nextTick } from "vue";

export default class implements Command {
  parse(command: string): boolean {
    if (["drawer", "d"].includes(command.trim())) {
      return true;
    }

    return false;
  }

  private printReceipt() {
    return new Promise<void>((resolve) => {
      window.onafterprint = (e) => {
        window.onafterprint = null;
        resolve();
      };

      if (window.electron) {
        window.electron.print({
          ...config.printerConfig,
          deviceName: this.getPrinterName(),
          silent: config.silentPrinting,
          pageSize: {
            width: parseInt(config.printWidth) * 1000,
            height: parseInt(config.printHeight) * 1000,
          },
        });
      } else {
        window.print();
      }
    });
  }

  async execute() {
    const cartManagerStore = useCartManagerStore();
    cartManagerStore.setPrintMode("drawer");
    await nextTick();

    await this.printReceipt();
  }
}
