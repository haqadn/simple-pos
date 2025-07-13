'use client'

import { Input, Textarea } from "@heroui/react";
import { useCurrentOrder, useCustomerInfoQuery } from "@/stores/orders";
import { useState, useEffect } from "react";
import { BillingSchema } from "@/api/orders";

export default function CustomerInfo() {
    const { query: orderQuery } = useCurrentOrder();
    const [customerInfoQuery, customerInfoMutation, customerInfoIsMutating] = useCustomerInfoQuery(orderQuery);
    const [localValues, setLocalValues] = useState<Partial<BillingSchema>>({});
    const [localName, setLocalName] = useState('');

    // Update local values when customer info query data changes
    useEffect(() => {
        if (customerInfoQuery.data) {
            setLocalValues(customerInfoQuery.data);
            const fullName = `${customerInfoQuery.data.first_name || ''} ${customerInfoQuery.data.last_name || ''}`.trim();
            setLocalName(fullName);
        }
    }, [customerInfoQuery.data]);

    const handleNameChange = (value: string) => {
        setLocalName(value);
        
        // Split the name and update the backend
        const [firstName, ...lastNameParts] = value.split(' ');
        const lastName = lastNameParts.join(' ');
        
        customerInfoMutation.mutate({ 
            billing: { 
                first_name: firstName || '',
                last_name: lastName || ''
            } 
        });
    };

    const handleFieldChange = (field: keyof BillingSchema, value: string) => {
        const newValues = { ...localValues, [field]: value };
        setLocalValues(newValues);
        customerInfoMutation.mutate({ billing: { [field]: value } });
    };

    if (orderQuery.isLoading) {
        return (
            <div className="my-4">
                <Input className="mb-4" label="Customer Name" isDisabled />
                <Input className="mb-4" label="Customer Phone" isDisabled />
                <Textarea className="mb-4" label="Customer Address" isDisabled />
            </div>
        );
    }

    const customerAddress = `${localValues.address_1 || ''}${localValues.address_2 ? ', ' + localValues.address_2 : ''}${localValues.city ? ', ' + localValues.city : ''}${localValues.state ? ', ' + localValues.state : ''}${localValues.postcode ? ' ' + localValues.postcode : ''}`;

    return (
        <div className="my-4">
            <Input 
                className="mb-4" 
                label="Customer Name" 
                value={localName}
                onValueChange={handleNameChange}
                color={customerInfoIsMutating ? 'warning' : 'default'}
            />
            <Input 
                className="mb-4" 
                label="Customer Phone" 
                value={localValues.phone || ''}
                onValueChange={(value) => handleFieldChange('phone', value)}
                color={customerInfoIsMutating ? 'warning' : 'default'}
            />
            <Textarea 
                className="mb-4" 
                label="Customer Address" 
                value={customerAddress}
                onValueChange={(value) => handleFieldChange('address_1', value)}
                color={customerInfoIsMutating ? 'warning' : 'default'}
            />
        </div>
    );
}