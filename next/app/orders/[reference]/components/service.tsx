'use client'

import { useShippingMethodsQuery } from "@/stores/shipping";
import { Card, CardBody, Chip, Kbd, Radio, RadioGroup, Tab, Tabs } from "@heroui/react";
import { useState } from "react";


export default function Service() {
    const [selectedTab, setSelectedTab] = useState("dine_in");

    return (
        <Card>
            <CardBody>
                <Tabs className="mb-2" fullWidth={true} selectedKey={selectedTab} onSelectionChange={(key) => setSelectedTab(key as string)}>
                    <Tab key="dine_in" title="Dine In"/>
                    <Tab key="take_out" title="Take Out"/>
                </Tabs>
                {selectedTab === "dine_in" && <DineInTab />}
                {selectedTab === "take_out" && <DeliveryTab />}
            </CardBody>
        </Card>
    );
}

function DineInTab() {
    return (
        <RadioGroup label="Table" orientation="horizontal">
            <RadioItem value="1">1</RadioItem>
            <RadioItem value="2">2</RadioItem>
            <RadioItem value="3">3</RadioItem>
            <RadioItem value="4">4</RadioItem>
            <RadioItem value="5">5</RadioItem>
            <RadioItem value="6">6</RadioItem>
        </RadioGroup>
    );
}

function DeliveryTab() {
    const { data: shippingMethods } = useShippingMethodsQuery();
    if (!shippingMethods || shippingMethods.length === 0) return null;

    const reacableCost = (cost: number) => {
        if (cost === 0) return "Free";
        return `${cost}`;
    }

    return (
        <RadioGroup label="Delivery location">
            {shippingMethods?.map((shippingMethod) => (
                <RadioItem
                    key={shippingMethod.id}
                    value={shippingMethod.id.toString()}
                >
                    
                    <Kbd>{shippingMethod.id}</Kbd>
                    <span className="mx-1">{shippingMethod.title}</span>
                    <span className="text-sm text-gray-500">({reacableCost(shippingMethod.cost)})</span>
                </RadioItem>
            ))}
        </RadioGroup>
    )
}

function RadioItem( { children, value, ...props }: { children: React.ReactNode, value: string, [key: string]: any } ) {
    return (
        <Radio
            {...props}
            value={value}
            classNames={{
                base: 
                    "inline-flex flex-1 m-0 bg-content1 hover:bg-content2 items-center justify-between" +
                    "w-full max-w-full flex-row cursor-pointer rounded-lg gap-4 p-4 border-2 border-transparent" +
                    "data-[selected=true]:border-primary",
            }}
        >
            {children}
        </Radio>
    )
}