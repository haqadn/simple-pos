'use client'

import { Textarea } from "@heroui/react";
import { useCurrentOrder, useOrderNoteQuery } from "@/stores/orders";
import { useState, useEffect } from "react";

export default function OrderNote() {
    const orderQuery = useCurrentOrder();
    const [noteQuery, noteMutation, noteIsMutating] = useOrderNoteQuery(orderQuery);
    const [localValue, setLocalValue] = useState('');

    // Update local value when note query data changes
    useEffect(() => {
        if (noteQuery.data !== undefined) {
            setLocalValue(noteQuery.data);
        }
    }, [noteQuery.data]);

    const handleChange = (value: string) => {
        setLocalValue(value);
        noteMutation.mutate({ note: value });
    };

    if (orderQuery.isLoading) {
        return <Textarea className="my-4" isDisabled />;
    }

    return (
        <Textarea
            className="my-4" 
            variant="underlined"
            placeholder="Order Note" 
            value={localValue}
            onValueChange={handleChange}
            color={noteIsMutating ? 'warning' : 'default'}
            minRows={1}
            maxRows={3}
        />
    );
}