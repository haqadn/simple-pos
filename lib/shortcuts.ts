/**
 * Centralized keyboard shortcuts registry
 * Single source of truth for all app keyboard shortcuts
 */

export interface ShortcutDefinition {
  id: string;
  key: string;
  code?: string; // For keys that need code matching (e.g., Digit0-9)
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  description: string;
}

/**
 * All registered app shortcuts
 */
export const APP_SHORTCUTS: ShortcutDefinition[] = [
  {
    id: 'newOrder',
    key: 'n',
    ctrl: true,
    description: 'Create new order',
  },
  {
    id: 'printKot',
    key: 'k',
    ctrl: true,
    description: 'Print KOT',
  },
  {
    id: 'printBill',
    key: 'p',
    ctrl: true,
    description: 'Print Bill',
  },
  {
    id: 'openDrawer',
    key: 'd',
    ctrl: true,
    description: 'Open cash drawer',
  },
  {
    id: 'done',
    key: 'Enter',
    ctrl: true,
    description: 'Complete order',
  },
  // Alt+0-9 for service selection
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `selectService${i}`,
    key: i.toString(),
    code: `Digit${i}`,
    alt: true,
    description: `Select service option ${i}`,
  })),
];

/**
 * Check if a keyboard event matches a shortcut definition
 */
function matchesShortcut(e: KeyboardEvent | React.KeyboardEvent, shortcut: ShortcutDefinition): boolean {
  // Check modifiers
  if (shortcut.ctrl && !e.ctrlKey) return false;
  if (shortcut.alt && !e.altKey) return false;
  if (shortcut.shift && !e.shiftKey) return false;
  if (shortcut.meta && !e.metaKey) return false;

  // Check that no extra modifiers are pressed (unless specified)
  if (!shortcut.ctrl && e.ctrlKey) return false;
  if (!shortcut.alt && e.altKey) return false;
  if (!shortcut.shift && e.shiftKey) return false;
  // Note: Don't check meta as it can be pressed with ctrl on some systems

  // Check key or code
  if (shortcut.code) {
    const code = 'nativeEvent' in e ? e.nativeEvent.code : e.code;
    return code === shortcut.code;
  }

  return e.key.toLowerCase() === shortcut.key.toLowerCase();
}

/**
 * Check if a keyboard event matches any registered app shortcut
 */
export function isAppShortcut(e: KeyboardEvent | React.KeyboardEvent): boolean {
  return APP_SHORTCUTS.some(shortcut => matchesShortcut(e, shortcut));
}

/**
 * Get the shortcut ID if the event matches a registered shortcut
 */
export function getMatchingShortcut(e: KeyboardEvent | React.KeyboardEvent): string | null {
  const shortcut = APP_SHORTCUTS.find(s => matchesShortcut(e, s));
  return shortcut?.id ?? null;
}

/**
 * Get shortcut by ID
 */
export function getShortcutById(id: string): ShortcutDefinition | undefined {
  return APP_SHORTCUTS.find(s => s.id === id);
}
