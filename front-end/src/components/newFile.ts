import { mapActions, mapState } from "pinia";
import { useCartStore } from "../stores/cart";
import { useItemStore } from "../stores/items";

export default (await import('vue')).defineComponent({
data: () => ({
currency: "৳",
coupon: {
name: "",
type: "percent",
amount: 0,
},
}),
computed: {
...mapState(useCartStore, [
"items",
"orderId",
"customerNote",
"cartName",
"previousKot",
]),

previousQuantities() {
try {
const prevKotObj = JSON.parse(this.previousKot);

return prevKotObj.reduce(
(
acc: { [pid: number]: number; },
item: { product_id: number; quantity: number; }
) => {
acc[item.product_id] = item.quantity;
return acc;
}, {});
} catch (e) {
return {};
}
},

filteredCartItems() {
return Object.values(this.items).filter(
(item) => item.quantity > 0 &&
this.shouldSkipProductFromKot(item.product_id) === false
);
},
},
methods: {
...mapActions(useItemStore, ["shouldSkipProductFromKot"]),
},
});
