import { get, post } from "./config";

export const getOrders = () => get('orders');

export const createOrder = () => post('orders', {});