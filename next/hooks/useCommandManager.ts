import { useCallback, useEffect, useRef, useState } from 'react';
import { CommandManager, CommandContext } from '@/commands/command-manager';
import { CommandState, CommandSuggestion } from '@/commands/command';
import { CommandExecutionResult } from '@/commands/command-registry';

const COMMAND_STATE_KEY = 'pos-command-state';

/**
 * Load persisted command state from localStorage
 */
function loadPersistedState(): CommandState | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(COMMAND_STATE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Only restore multi-mode state, not data
      if (parsed.mode === 'multi' && parsed.activeCommand) {
        return {
          mode: 'multi',
          activeCommand: parsed.activeCommand,
          prompt: parsed.prompt,
        };
      }
    }
  } catch (e) {
    console.error('Failed to load command state:', e);
  }
  return null;
}

/**
 * Persist command state to localStorage
 */
function persistState(state: CommandState): void {
  if (typeof window === 'undefined') return;
  try {
    if (state.mode === 'multi') {
      localStorage.setItem(COMMAND_STATE_KEY, JSON.stringify({
        mode: state.mode,
        activeCommand: state.activeCommand,
        prompt: state.prompt,
      }));
    } else {
      localStorage.removeItem(COMMAND_STATE_KEY);
    }
  } catch (e) {
    console.error('Failed to persist command state:', e);
  }
}

/**
 * Hook to manage the command system
 */
export function useCommandManager() {
  const managerRef = useRef<CommandManager | null>(null);
  const [state, setState] = useState<CommandState>({ mode: 'normal' });
  const [isReady, setIsReady] = useState(false);

  // Initialize command manager with persisted state
  useEffect(() => {
    if (!managerRef.current) {
      const savedState = loadPersistedState();
      managerRef.current = new CommandManager(savedState || undefined);
      if (savedState) {
        setState(savedState);
      }
      setIsReady(true);
    }
  }, []);

  // Update state when command manager state changes and persist it
  const updateState = useCallback(() => {
    if (managerRef.current) {
      const newState = managerRef.current.getState();
      setState(newState);
      persistState(newState);
    }
  }, []);

  /**
   * Set the command context (data and functions for commands)
   */
  const setContext = useCallback((context: CommandContext) => {
    if (managerRef.current) {
      managerRef.current.setContext(context);
    }
  }, []);

  /**
   * Process user input
   */
  const processInput = useCallback(async (input: string): Promise<CommandExecutionResult> => {
    if (!managerRef.current) {
      return {
        success: false,
        error: 'Command manager not initialized'
      };
    }

    const result = await managerRef.current.processInput(input);
    updateState();
    return result;
  }, [updateState]);

  /**
   * Get autocomplete suggestions
   */
  const getAutocompleteSuggestions = useCallback((partialInput: string): CommandSuggestion[] => {
    if (!managerRef.current) return [];
    return managerRef.current.getAutocompleteSuggestions(partialInput);
  }, []);

  /**
   * Navigate command history
   */
  const navigateHistory = useCallback((direction: 'up' | 'down'): string | null => {
    if (!managerRef.current) return null;
    return managerRef.current.navigateHistory(direction);
  }, []);

  /**
   * Get help text
   */
  const getHelp = useCallback((commandKeyword?: string): string => {
    if (!managerRef.current) return 'Command manager not initialized';
    return managerRef.current.getHelp(commandKeyword);
  }, []);

  /**
   * Reset command state
   */
  const reset = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.reset();
      updateState();
    }
  }, [updateState]);

  /**
   * Get current prompt text
   */
  const getPrompt = useCallback((): string => {
    if (!managerRef.current) return '>';
    return managerRef.current.getPrompt();
  }, []);

  /**
   * Check if in multi-input mode
   */
  const isInMultiMode = useCallback((): boolean => {
    if (!managerRef.current) return false;
    return managerRef.current.isInMultiMode();
  }, []);

  /**
   * Get active command in multi-mode
   */
  const getActiveCommand = useCallback((): string | undefined => {
    if (!managerRef.current) return undefined;
    return managerRef.current.getActiveCommand();
  }, []);

  /**
   * Set callback for async suggestion updates (e.g., customer search)
   */
  const setSuggestionsCallback = useCallback((callback: () => void) => {
    if (!managerRef.current) return;
    // Find customer command and set callback
    const registry = (managerRef.current as unknown as { registry: { getCommand: (k: string) => unknown } }).registry;
    const customerCommand = registry?.getCommand('customer');
    if (customerCommand && 'setSuggestionsCallback' in customerCommand) {
      (customerCommand as { setSuggestionsCallback: (cb: () => void) => void }).setSuggestionsCallback(callback);
    }
  }, []);

  return {
    // State
    state,
    isReady,
    
    // Core functions
    setContext,
    processInput,
    
    // Autocomplete and history
    getAutocompleteSuggestions,
    navigateHistory,
    
    // Utility functions
    getHelp,
    reset,
    getPrompt,
    isInMultiMode,
    getActiveCommand,
    setSuggestionsCallback,
  };
}