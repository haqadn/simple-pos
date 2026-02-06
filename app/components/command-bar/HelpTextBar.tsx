'use client';

import { useState } from 'react';
import { Kbd, Link, useDisclosure } from '@heroui/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Settings01Icon } from '@hugeicons/core-free-icons';
import { useSettingsStore, type PageShortcut } from '@/stores/settings';
import { SettingsModal } from '../settings-modal';
import { ShortcutModal } from '../shortcut-modal';

interface HelpTextBarProps {
  multiMode: boolean;
  activeCommand: string | undefined;
}

export function HelpTextBar({ multiMode, activeCommand }: HelpTextBarProps) {
  const pageShortcuts = useSettingsStore((state) => state.pageShortcuts);
  const [activeShortcut, setActiveShortcut] = useState<PageShortcut | null>(null);
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onOpenChange: onSettingsOpenChange } = useDisclosure();
  const { isOpen: isShortcutOpen, onOpen: onShortcutOpen, onOpenChange: onShortcutOpenChange } = useDisclosure();

  const handleOpenShortcut = (shortcut: PageShortcut) => {
    setActiveShortcut(shortcut);
    onShortcutOpen();
  };

  return (
    <div className="text-xs text-gray-400 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {multiMode ? (
          `Multi-input mode: Type ${activeCommand} parameters, or "/" to exit`
        ) : (
          <>
            <span>SKU [qty] | /pay /done | &uarr;&darr; history |</span>
            <Kbd className="text-[10px]">Esc</Kbd>
          </>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Link
          className="text-gray-400 cursor-pointer hover:text-gray-600"
          onPress={onSettingsOpen}
          aria-label="Settings"
        >
          <HugeiconsIcon icon={Settings01Icon} className="h-4 w-4" />
        </Link>
        {pageShortcuts.map((shortcut) => (
          <span key={shortcut.id} className="flex items-center">
            <span className="mx-1">|</span>
            <Link
              size="sm"
              className="text-xs text-gray-400 cursor-pointer"
              onPress={() => handleOpenShortcut(shortcut)}
            >
              {shortcut.name}
            </Link>
          </span>
        ))}
      </div>
      <SettingsModal isOpen={isSettingsOpen} onOpenChange={onSettingsOpenChange} />
      {activeShortcut && (
        <ShortcutModal
          isOpen={isShortcutOpen}
          onOpenChange={onShortcutOpenChange}
          name={activeShortcut.name}
          url={activeShortcut.url}
        />
      )}
    </div>
  );
}
