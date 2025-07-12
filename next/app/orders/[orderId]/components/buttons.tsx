'use client'

import { ButtonGroup, Button, Divider, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";

export default function Buttons() {
    return (
        <div className="bg-white">
            <ButtonGroup fullWidth>
                <Button color="primary">Save</Button>
                <Button color="default">KOT</Button>
                <Button color="default">Bill</Button>
                <Dropdown placement="bottom-end">
                    <DropdownTrigger>
                        <Button>Cancel</Button>
                    </DropdownTrigger>
                    <DropdownMenu>
                        <DropdownItem key="cancel" color="danger">Confirm</DropdownItem>
                    </DropdownMenu>
                </Dropdown>
            </ButtonGroup>
        </div>
    );
}