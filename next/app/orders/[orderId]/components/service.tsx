'use client'

import { useDeliveryZonesQuery, useTablesQuery, ServiceMethodSchema } from "@/stores/service";
import { useCurrentOrder, useServiceQuery } from "@/stores/orders";
import { Card, CardBody, Radio, RadioGroup, Tab, Tabs } from "@heroui/react";
import { useState, useEffect } from "react";


export default function Service() {
    const { query: orderQuery } = useCurrentOrder();
    const [serviceQuery, serviceMutation, isMutating] = useServiceQuery(orderQuery);
    
    const currentService = serviceQuery.data;
    const [selectedTab, setSelectedTab] = useState(currentService?.type === 'takeaway' ? 'delivery' : 'table');

    // Sync tab with current service
    useEffect(() => {
        if (currentService?.type) {
            setSelectedTab(currentService.type === 'takeaway' ? 'delivery' : 'table');
        }
    }, [currentService?.type]);

    return (
        <Card 
            className="mb-4" 
            classNames={{
                base: currentService ? '' : 'bg-warning-100',
            }}
        >
            <CardBody>
                <Tabs className="mb-2" fullWidth={true} selectedKey={selectedTab} onSelectionChange={(key) => setSelectedTab(key as string)}>
                    <Tab key="table" title="Table"/>
                    <Tab key="delivery" title="Delivery"/>
                </Tabs>
                {selectedTab === "table" && <TableServiceTab currentService={currentService} onServiceChange={serviceMutation} isMutating={isMutating} />}
                {selectedTab === "delivery" && <DeliveryServiceTab currentService={currentService} onServiceChange={serviceMutation} isMutating={isMutating} />}
            </CardBody>
        </Card>
    );
}

interface ServiceTabProps {
    currentService?: ServiceMethodSchema;
    onServiceChange: any;
    isMutating: boolean;
}

function TableServiceTab({ currentService, onServiceChange, isMutating }: ServiceTabProps) {
    const { data: tables } = useTablesQuery();
    if (!tables || tables.length === 0) return null;

    const handleSelectionChange = (selectedSlug: string) => {
        const selectedTable = tables.find(table => table.slug === selectedSlug);
        if (selectedTable && selectedTable.slug !== currentService?.slug) {
            onServiceChange.mutate({ service: selectedTable });
        }
    };

    return (
        <RadioGroup 
            aria-label="Tables" 
            orientation="horizontal"
            value={currentService?.type === 'table' ? currentService.slug : ''}
            onValueChange={handleSelectionChange}
        >
            {tables.map((table) => (
                <RadioItem 
                    key={table.slug} 
                    value={table.slug}
                    disabled={isMutating}
                >
                    {table.title}
                </RadioItem>
            ))}
        </RadioGroup>
    );
}

function DeliveryServiceTab({ currentService, onServiceChange, isMutating }: ServiceTabProps) {
    const { data: deliveryZones } = useDeliveryZonesQuery();
    if (!deliveryZones || deliveryZones.length === 0) return null;

    const readableCost = (cost: number) => {
        if (cost === 0) return "Free";
        return `${cost}`;
    }

    const handleSelectionChange = (selectedSlug: string) => {
        const selectedZone = deliveryZones.find(zone => zone.slug === selectedSlug);
        if (selectedZone && selectedZone.slug !== currentService?.slug) {
            onServiceChange.mutate({ service: selectedZone });
        }
    };

    return (
        <RadioGroup 
            aria-label="Delivery zones"
            value={currentService?.type === 'takeaway' ? currentService.slug : ''}
            onValueChange={handleSelectionChange}
        >
            {deliveryZones.map((zone) => (
                <RadioItem
                    key={zone.slug}
                    value={zone.slug}
                    disabled={isMutating}
                >
                    <span className="mx-1">{zone.title}</span>
                    <span className="text-sm text-gray-500">({readableCost(zone.fee)})</span>
                </RadioItem>
            ))}
        </RadioGroup>
    )
}

function RadioItem( { children, value, disabled, ...props }: { children: React.ReactNode, value: string, disabled?: boolean, [key: string]: any } ) {
    return (
        <Radio
            {...props}
            value={value}
            isDisabled={disabled}
            classNames={{
                base: 
                    "inline-flex flex-1 m-0 bg-content1 hover:bg-content2 items-center justify-between" +
                    "w-full max-w-full flex-row cursor-pointer rounded-lg gap-4 p-4 border-2 border-transparent" +
                    "data-[selected=true]:border-primary data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed",
            }}
        >
            {children}
        </Radio>
    )
}