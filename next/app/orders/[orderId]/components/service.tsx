'use client'

import { useDeliveryZonesQuery, useTablesQuery } from "@/stores/service";
import { Card, CardBody, Radio, RadioGroup, Tab, Tabs } from "@heroui/react";
import { useState } from "react";


export default function Service() {
    const [selectedTab, setSelectedTab] = useState("table");

    return (
        <Card className="mb-4">
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
    const { data: tables } = useTablesQuery();
    if (!tables || tables.length === 0) return null;

    return (
        <RadioGroup aria-label="Tables" orientation="horizontal">
            {tables.map((table) => (
                <RadioItem key={table.slug} value={table.slug}>
                    {table.title}
                </RadioItem>
            ))}
        </RadioGroup>
    );
}

function DeliveryServiceTab() {
    const { data: deliveryZones } = useDeliveryZonesQuery();
    if (!deliveryZones || deliveryZones.length === 0) return null;

    const readableCost = (cost: number) => {
        if (cost === 0) return "Free";
        return `${cost}`;
    }

    return (
        <RadioGroup aria-label="Delivery zones">
            {deliveryZones.map((zone) => (
                <RadioItem
                    key={zone.slug}
                    value={zone.slug}
                >
                    
                    <span className="mx-1">{zone.title}</span>
                    <span className="text-sm text-gray-500">({readableCost(zone.fee)})</span>
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