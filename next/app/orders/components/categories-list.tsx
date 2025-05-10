'use client'

import { useCategoriesQuery } from "@/stores/products";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings01Icon } from '@hugeicons/core-free-icons';
import {
    Chip,
    Skeleton,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    useDisclosure,
} from "@heroui/react";

const decodeHtmlEntities = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
};

const CategorySkeleton = () => {
    return (
        <Chip className="m-1">
            <Skeleton className="w-24 h-4" />
        </Chip>
    )
}

const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="-mx-1 my-4 flex flex-wrap">
            {children}
        </div>
    )
}

export default function CategoriesList() {
    const { data: categories, isLoading } = useCategoriesQuery();

    const { isOpen, onOpenChange, onOpen } = useDisclosure();

    if( ! categories && isLoading ) {
        return (
            <Wrapper>
                <CategorySkeleton />
                <CategorySkeleton />
                <CategorySkeleton />
                <CategorySkeleton />
                <CategorySkeleton />
                <CategorySkeleton />
                <CategorySkeleton />
                <CategorySkeleton />
            </Wrapper>
        );
    }

    if ( !categories ) {
        return (
            <Wrapper>
                <p>No categories found</p>
            </Wrapper>
        );
    }

    return (
        <Wrapper>
            {categories.map((category) => (
                <Button className="m-1" variant="light" key={category.id}>
                    {decodeHtmlEntities(category.name)}
                </Button>
            ))}
            <Button className="m-1" variant="light" onPress={onOpen}>
                <HugeiconsIcon icon={Settings01Icon} className="h-4 w-4" />
            </Button>
            <CategoryConfig isOpen={isOpen} onOpenChange={onOpenChange} />
        </Wrapper>
    )
}

const CategoryConfig = ( { isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (isOpen: boolean) => void }) => {
    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <ModalContent>
                {(onClose) => (
                <>
                <ModalHeader className="flex flex-col gap-1">Modal Title</ModalHeader>
                <ModalBody>
                    <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam pulvinar risus non
                    risus hendrerit venenatis. Pellentesque sit amet hendrerit risus, sed porttitor
                    quam.
                    </p>
                    <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam pulvinar risus non
                    risus hendrerit venenatis. Pellentesque sit amet hendrerit risus, sed porttitor
                    quam.
                    </p>
                    <p>
                    Magna exercitation reprehenderit magna aute tempor cupidatat consequat elit dolor
                    adipisicing. Mollit dolor eiusmod sunt ex incididunt cillum quis. Velit duis sit
                    officia eiusmod Lorem aliqua enim laboris do dolor eiusmod. Et mollit incididunt
                    nisi consectetur esse laborum eiusmod pariatur proident Lorem eiusmod et. Culpa
                    deserunt nostrud ad veniam.
                    </p>
                </ModalBody>
                <ModalFooter>
                    <Button color="danger" variant="light" onPress={onClose}>
                    Close
                    </Button>
                    <Button color="primary" onPress={onClose}>
                    Action
                    </Button>
                </ModalFooter>
                </>
            )}
            </ModalContent>
        </Modal>
    )
}