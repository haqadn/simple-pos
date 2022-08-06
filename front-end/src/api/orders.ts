import { API } from "./api";

export default class OrdersAPI extends API {
    static async saveOrder(order) {
        return await this.client.post('/orders', order);
    }
}