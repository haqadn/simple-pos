'use client'

import Service from "./service";
import LineItems from "./line-items";
import PaymentCard from "./payment-card";
import OrderNote from "./order-note";
import CustomerInfo from "./customer-info";

export default function Order( {orderId}: {orderId: string} ) {
    return (
    <div className="overflow-y-auto h-full -m-4 p-4">
        <h2 className="text-xl font-bold mb-4">Order #{orderId}</h2>
        <Service />
        <LineItems />
        <PaymentCard />
        <OrderNote />
        <CustomerInfo />
    </div> 
    );
}