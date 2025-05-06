'use client'
import {Input} from "@heroui/react";

export default function CommandBar() {
    return (
        <>
            <Input classNames={ {
                mainWrapper: 'w-full',
            } } labelPlacement="outside-left" label="Command" />
        </>
    )
}