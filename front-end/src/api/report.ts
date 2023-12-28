import { API } from "./api";

export default class ReportAPI extends API {
  static async get(from: string, to: string) {
    return await this.client.get("/simple-pos/report", {
      params: { from, to },
    });
  }
}
