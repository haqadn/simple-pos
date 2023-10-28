import Clear from "../commands/clear";
import AddCustomerInfo from "../commands/add-customer-info";
import Pay from "../commands/pay";
import Save from "../commands/save";
import Coupon from "../commands/coupon";
import Done from "../commands/done";
import OpenOrder from "../commands/open-order";
import RemoveBySKU from "../commands/remove-by-sku";
import AddBySKU from "../commands/add-by-sku";
import ManageStock from "../commands/manage-stock";
import LastOrder from "../commands/last-order";
import Print from "../commands/print";
import SelectCart from "../commands/select-cart";
import MoveTables from "../commands/move-tables";

const commands = [
  Clear,
  AddCustomerInfo,
  SelectCart,
  Pay,
  Print,
  Save,
  LastOrder,
  OpenOrder,
  RemoveBySKU,
  Coupon,
  Done,
  AddBySKU,
  ManageStock,
  MoveTables,
];

export function tryToExecuteCommand(line: string) {
  for (let i = 0; i < commands.length; i++) {
    const Command = commands[i];
    const command = new Command();
    if (command.parse(line.trim())) {
      command.execute();
      return true;
    }
  }
  return false;
}
