'use client'

import { useDeliveryZonesQuery, useTablesQuery } from "@/stores/service";
import { useCurrentOrder, useServiceQuery } from "@/stores/orders";
import { Card, CardBody, Radio, RadioGroup } from "@heroui/react";

export default function Service() {
    const orderQuery = useCurrentOrder();
    const [serviceQuery, serviceMutation, isMutating] = useServiceQuery(orderQuery);
    const { data: tables } = useTablesQuery();
    const { data: deliveryZones } = useDeliveryZonesQuery();
    
    const currentService = serviceQuery.data;

    const handleSelectionChange = (selectedSlug: string) => {
        // Find in tables first
        const selectedTable = tables?.find(table => table.slug === selectedSlug);
        if (selectedTable && selectedTable.slug !== currentService?.slug) {
            serviceMutation.mutate({ service: selectedTable });
            return;
        }

        // Then find in delivery zones
        const selectedZone = deliveryZones?.find(zone => zone.slug === selectedSlug);
        if (selectedZone && selectedZone.slug !== currentService?.slug) {
            serviceMutation.mutate({ service: selectedZone });
        }
    };

    const readableCost = (cost: number) => {
        if (cost === 0) return "Free";
        return `${cost}`;
    };

    const allOptions = [
        ...(tables || []),
        ...(deliveryZones || [])
    ];

    if (allOptions.length === 0) return null;

    return (
        <Card 
            className="mb-4" 
            classNames={{
                base: ! currentService || isMutating > 0 ? 'bg-warning-100' : '',
            }}
        >
            <CardBody>
                {tables && tables.length > 0 && (
                    <>
                        <div className="text-sm bg-default-100 p-3 rounded-lg font-medium text-foreground-500 mb-2 mt-1 flex items-center gap-2">
                            Table
                        </div>
                        <RadioGroup 
                            aria-label="Tables"
                            orientation="horizontal"
                            value={currentService?.type === 'table' ? currentService.slug : ''}
                            onValueChange={handleSelectionChange}
                            className="mb-4"
                        >
                            {tables.map((table) => (
                                <RadioItem 
                                    key={table.slug} 
                                    value={table.slug}
                                >
                                    {table.title}
                                </RadioItem>
                            ))}
                        </RadioGroup>
                    </>
                )}
                {deliveryZones && deliveryZones.length > 0 && (
                    <>
                        <div className="text-sm bg-default-100 p-3 rounded-lg font-medium text-foreground-500 mb-2 mt-1 flex items-center gap-2">
                            Delivery
                        </div>
                        <RadioGroup 
                            aria-label="Delivery zones"
                            value={currentService?.type === 'takeaway' ? currentService.slug : ''}
                            orientation="horizontal"
                            onValueChange={handleSelectionChange}
                        >
                            {deliveryZones.map((zone) => (
                                <RadioItem
                                    key={zone.slug}
                                    value={zone.slug}
                                >
                                    {zone.title}
                                    <span className="text-sm text-gray-500 ml-2">({readableCost(zone.fee)})</span>
                                </RadioItem>
                            ))}
                        </RadioGroup>
                    </>
                )}
            </CardBody>
        </Card>
    );
}

function RadioItem( { children, value, disabled }: { children: React.ReactNode, value: string, disabled?: boolean } ) {
    return (
        <Radio
            value={value}
            isDisabled={disabled}
            classNames={{
                label: "text-xs",
                base: 'mr-4',
            }}
        >
            {children}
        </Radio>
    )
}