'use client'

import { Input, Textarea } from "@heroui/react";

export default function CustomerInfo() {
    return (
        <div className="my-4">
            <Input className="mb-4" label="Name" />
            <Input className="mb-4" label="Phone" />
            <Textarea className="mb-4" label="Address" />
        </div>
    );
}