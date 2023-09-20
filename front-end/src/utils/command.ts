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

const commands = [
  Clear,
  AddCustomerInfo,
  Pay,
  Save,
  LastOrder,
  OpenOrder,
  RemoveBySKU,
  Coupon,
  Done,
  AddBySKU,
  ManageStock,
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