'use client';

import Buttons from "../[orderId]/components/buttons";
import CustomerInfo from "../[orderId]/components/customer-info";
import LineItems from "../[orderId]/components/line-items";
import OrderNote from "../[orderId]/components/order-note";
import PaymentCard from "../[orderId]/components/payment-card";
import Service from "../[orderId]/components/service";

export default function NewOrderPage() {
    return (
        <div className="flex flex-col h-full w-2/5 min-w-[500px] overflow-hidden">
            <h2 className="text-xl font-bold mb-4 px-4">New Order</h2>
            <div className="flex-1 flex flex-row overflow-hidden">
                <div className="flex flex-col h-full w-1/2 p-4">
                    <LineItems />
                    <div className="flex-1"></div>
                    <OrderNote />
                    <PaymentCard />
                </div>
                <div className="w-1/2 overflow-y-auto h-full p-4">
                    <Service />
                    <CustomerInfo />
                </div>
            </div>
            <div className="mx-4">
                <Buttons />
            </div>
        </div>
    );
}
