'use client';

import { useState } from 'react';
import { Input, Button } from '@heroui/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, Delete02Icon, ArrowUp01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { type PaymentMethodConfig } from '@/stores/settings';

interface PaymentMethodsTabProps {
  localMethods: PaymentMethodConfig[];
  setLocalMethods: (methods: PaymentMethodConfig[]) => void;
}

export function PaymentMethodsTab({ localMethods, setLocalMethods }: PaymentMethodsTabProps) {
  const [newMethodLabel, setNewMethodLabel] = useState('');

  const handleAdd = () => {
    if (!newMethodLabel.trim()) return;

    // Generate key from label (lowercase, replace spaces with underscores)
    const key = newMethodLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    // Check for duplicate key
    if (localMethods.some(m => m.key === key)) {
      return; // Prevent duplicates
    }

    const newMethod: PaymentMethodConfig = {
      key,
      label: newMethodLabel.trim(),
    };
    setLocalMethods([...localMethods, newMethod]);
    setNewMethodLabel('');
  };

  const handleRemove = (key: string) => {
    setLocalMethods(localMethods.filter(m => m.key !== key));
  };

  const handleUpdate = (key: string, newLabel: string) => {
    setLocalMethods(
      localMethods.map(m => (m.key === key ? { ...m, label: newLabel } : m))
    );
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newMethods = [...localMethods];
    [newMethods[index - 1], newMethods[index]] = [newMethods[index], newMethods[index - 1]];
    setLocalMethods(newMethods);
  };

  const handleMoveDown = (index: number) => {
    if (index === localMethods.length - 1) return;
    const newMethods = [...localMethods];
    [newMethods[index], newMethods[index + 1]] = [newMethods[index + 1], newMethods[index]];
    setLocalMethods(newMethods);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-small text-default-500">
        Configure additional payment methods available in the payment card.
        Cash is always available and cannot be removed.
      </p>

      {/* Existing methods list */}
      {localMethods.length === 0 ? (
        <p className="text-default-400 text-center py-4">
          No additional payment methods configured. Add methods below.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {localMethods.map((method, index) => (
            <div key={method.key} className="flex gap-2 items-center">
              <Input
                size="sm"
                value={method.label}
                onValueChange={(value) => handleUpdate(method.key, value)}
                className="flex-1"
                aria-label={`Payment method ${method.label}`}
              />
              <span className="text-xs text-default-400 min-w-16">
                {method.key}
              </span>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => handleMoveUp(index)}
                isDisabled={index === 0}
                aria-label="Move up"
              >
                <HugeiconsIcon icon={ArrowUp01Icon} className="h-4 w-4" />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => handleMoveDown(index)}
                isDisabled={index === localMethods.length - 1}
                aria-label="Move down"
              >
                <HugeiconsIcon icon={ArrowDown01Icon} className="h-4 w-4" />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                color="danger"
                onPress={() => handleRemove(method.key)}
                aria-label={`Remove ${method.label}`}
              >
                <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new method */}
      <div className="flex gap-2 items-end pt-4 border-t border-default-200">
        <Input
          size="sm"
          label="New Payment Method"
          placeholder="e.g., Visa, MasterCard, Apple Pay"
          value={newMethodLabel}
          onValueChange={setNewMethodLabel}
          onKeyPress={handleKeyPress}
          className="flex-1"
        />
        <Button
          size="sm"
          variant="flat"
          color="primary"
          onPress={handleAdd}
          isDisabled={!newMethodLabel.trim()}
          startContent={<HugeiconsIcon icon={Add01Icon} className="h-4 w-4" />}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
