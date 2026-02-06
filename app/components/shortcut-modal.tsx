'use client';

import { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Spinner,
} from '@heroui/react';

interface ShortcutModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  name: string;
  url: string;
}

export function ShortcutModal({ isOpen, onOpenChange, name, url }: ShortcutModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setIsLoading(true); // Reset loading state when closing
    }
    onOpenChange(open);
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      size="full"
      scrollBehavior="inside"
      classNames={{
        base: 'max-h-[90vh]',
        body: 'p-0',
      }}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="border-b">{name}</ModalHeader>
            <ModalBody className="relative">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                  <Spinner size="lg" />
                </div>
              )}
              <iframe
                src={url}
                className="w-full h-full min-h-[70vh] border-0"
                onLoad={handleLoad}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                title={name}
              />
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
