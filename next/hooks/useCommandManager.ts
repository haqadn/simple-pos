import { useCallback, useEffect, useRef, useState } from 'react';
import { CommandManager, CommandContext } from '@/commands/command-manager';
import { CommandState, CommandSuggestion } from '@/commands/command';
import { CommandExecutionResult } from '@/commands/command-registry';

/**
 * Hook to manage the command system
 */
export function useCommandManager() {
  const managerRef = useRef<CommandManager | null>(null);
  const [state, setState] = useState<CommandState>({ mode: 'normal' });
  const [isReady, setIsReady] = useState(false);

  // Initialize command manager
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new CommandManager();
      setIsReady(true);
    }
  }, []);

  // Update state when command manager state changes
  const updateState = useCallback(() => {
    if (managerRef.current) {
      setState(managerRef.current.getState());
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
  };
}