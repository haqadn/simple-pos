'use client'

import { useShippingMethodsQuery } from "@/stores/shipping";
import { Card, CardBody, Kbd, Radio, RadioGroup, Tab, Tabs } from "@heroui/react";
import { useState } from "react";


export default function Service() {
    const [selectedTab, setSelectedTab] = useState("table");

    return (
        <Card>
            <CardBody>
                <Tabs className="mb-2" fullWidth={true} selectedKey={selectedTab} onSelectionChange={(key) => setSelectedTab(key as string)}>
                    <Tab key="table" title="Table"/>
                    <Tab key="delivery" title="Delivery"/>
                </Tabs>
                {selectedTab === "table" && <TableServiceTab />}
                {selectedTab === "delivery" && <DeliveryServiceTab />}
            </CardBody>
        </Card>
    );
}

function TableServiceTab() {
    return (
        <RadioGroup label="Table" orientation="horizontal">
            <RadioItem value="1"><Kbd>t1</Kbd> 1</RadioItem>
            <RadioItem value="2"><Kbd>t2</Kbd> 2</RadioItem>
            <RadioItem value="3"><Kbd>t3</Kbd> 3</RadioItem>
            <RadioItem value="4"><Kbd>t4</Kbd> 4</RadioItem>
            <RadioItem value="5"><Kbd>t5</Kbd> 5</RadioItem>
            <RadioItem value="6"><Kbd>t6</Kbd> 6</RadioItem>
        </RadioGroup>
    );
}

function DeliveryServiceTab() {
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
                    
                    <Kbd>d{shippingMethod.id}</Kbd>
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