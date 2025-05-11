'use client'

import { Divider, Textarea } from "@heroui/react";

export default function OrderNote() {
    return (
        <>
            <Divider className="my-4" />
            <Textarea placeholder="Order Note" />
        </>
    );
}