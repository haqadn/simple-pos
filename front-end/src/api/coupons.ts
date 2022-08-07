import { API } from "./api";

export default class CouponsAPI extends API {
  static async getCoupon(code) {
    return await this.client.get(`/coupons`, {
      params: {
        code,
      }
    });
  }

}
