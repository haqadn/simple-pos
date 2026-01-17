/**
 * Command state for the CLI interface
 */
export interface CommandState {
  /** Current mode: 'normal' or 'multi' */
  mode: 'normal' | 'multi';
  /** Active multi-input command (e.g., 'add') */
  activeCommand?: string;
  /** Prompt prefix for multi-input mode */
  prompt?: string;
  /** Command-specific state data */
  data?: unknown;
}

/**
 * Command metadata for registration and help
 */
export interface CommandMetadata {
  /** Primary command keyword (without /) */
  keyword: string;
  /** Alternative keywords/aliases (without /) */
  aliases?: string[];
  /** Command description for help */
  description: string;
  /** Usage examples */
  usage: string[];
  /** Parameters for the command */
  parameters?: CommandParameter[];
}

export interface CommandParameter {
  name: string;
  type: 'string' | 'number' | 'sku' | 'customer' | 'table';
  required: boolean;
  description: string;
}

/**
 * Command autocomplete suggestion
 */
export interface CommandSuggestion {
  text: string;
  description: string;
  insertText: string;
  type: 'command' | 'parameter' | 'value';
}

/**
 * Multi-input command result
 */
export interface MultiInputResult {
  /** Continue in multi-input mode */
  continue: boolean;
  /** New prompt text (if changed) */
  prompt?: string;
  /** Success message */
  message?: string;
  /** Error message */
  error?: string;
  /** Updated command data */
  data?: unknown;
}

/**
 * Base interface that all POS commands must implement
 */
export interface Command {
  /**
   * Get command metadata for registration and autocomplete
   */
  getMetadata(): CommandMetadata;

  /**
   * Check if this command matches the given keyword/alias
   */
  matches(keyword: string): boolean;

  /**
   * Execute command with parameters
   * Called for: /command param1 param2
   * 
   * @param args - Command arguments (excluding the command keyword)
   * @returns Promise that resolves when command execution is complete
   */
  execute(args: string[]): Promise<void>;

  /**
   * Get autocomplete suggestions for partial input
   *
   * @param partialInput - The partial input being typed (without /)
   * @returns Array of autocomplete suggestions
   */
  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[];

  /**
   * Cleanup resources when command is disposed
   * Optional - implement if command has timers, subscriptions, etc.
   */
  dispose?(): void;
}

/**
 * Interface for commands that support multi-input mode
 */
export interface MultiInputCommand extends Command {
  /**
   * Enter multi-input mode
   * Called when: /command (no parameters)
   * 
   * @returns Promise with initial multi-input state
   */
  enterMultiMode(): Promise<{ prompt: string; data?: unknown }>;

  /**
   * Exit multi-input mode (cleanup)
   * Called when exiting multi-input mode (via / or another command)
   * 
   * @param currentData - Current multi-input state data
   * @returns Promise for any cleanup operations
   */
  exitMultiMode(currentData?: unknown): Promise<void>;

  /**
   * Get autocomplete suggestions for multi-input mode
   * 
   * @param partialInput - The partial input being typed
   * @param multiData - Current multi-input state data
   * @returns Array of autocomplete suggestions
   */
  getMultiModeAutocompleteSuggestions(partialInput: string, multiData?: unknown): CommandSuggestion[];
}

// Import for context type - will be defined in command-manager.ts
// Forward declaration to avoid circular dependency
interface BaseCommandContext {
  currentOrder?: { id: number; line_items: unknown[] };
}

/**
 * Base abstract class that provides common functionality for commands
 */
export abstract class BaseCommand implements Command {
  protected _context?: BaseCommandContext;

  abstract getMetadata(): CommandMetadata;
  abstract execute(args: string[]): Promise<void>;

  /**
   * Set the command context
   */
  setContext(context: BaseCommandContext): void {
    this._context = context;
  }

  /**
   * Get context, throwing if not set
   */
  protected requireContext<T extends BaseCommandContext>(): T {
    if (!this._context) {
      throw new Error('Command context not set');
    }
    return this._context as T;
  }

  /**
   * Get active order from context, throwing if not available
   */
  protected requireActiveOrder<T extends { id: number } = { id: number; line_items: unknown[] }>(): T {
    const context = this.requireContext();
    if (!context.currentOrder) {
      throw new Error('No active order');
    }
    return context.currentOrder as unknown as T;
  }

  /**
   * Default implementation checks if keyword matches any of the command's keywords/aliases
   */
  matches(keyword: string): boolean {
    const metadata = this.getMetadata();
    const normalizedKeyword = keyword.toLowerCase();
    
    return metadata.keyword === normalizedKeyword || 
           (metadata.aliases || []).includes(normalizedKeyword);
  }

  /**
   * Default autocomplete implementation
   */
  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    const metadata = this.getMetadata();
    const parts = partialInput.trim().split(/\s+/);
    const keyword = parts[0];

    // If we're still typing the keyword, suggest command completions
    if (parts.length === 1) {
      const suggestions: CommandSuggestion[] = [];
      const lowerKeyword = keyword.toLowerCase();

      // Only suggest if it's a partial match, not an exact match
      // Primary keyword
      if (metadata.keyword.startsWith(lowerKeyword) && metadata.keyword !== lowerKeyword) {
        suggestions.push({
          text: '/' + metadata.keyword,
          description: metadata.description,
          insertText: '/' + metadata.keyword + ' ',
          type: 'command'
        });
      }

      // Aliases
      metadata.aliases?.forEach(alias => {
        if (alias.startsWith(lowerKeyword) && alias !== lowerKeyword) {
          suggestions.push({
            text: '/' + alias,
            description: `${metadata.description} (alias)`,
            insertText: '/' + alias + ' ',
            type: 'command'
          });
        }
      });

      return suggestions;
    }

    // For commands with parameters
    if (this.matches(keyword) && metadata.parameters) {
      const paramIndex = parts.length - 2; // -1 for keyword, -1 for 0-based index
      const param = metadata.parameters[paramIndex];
      
      if (param) {
        return this.getParameterSuggestions(param, parts[parts.length - 1]);
      }
    }

    return [];
  }

  /**
   * Get suggestions for a specific parameter type
   */
  protected getParameterSuggestions(param: CommandParameter, partialValue: string): CommandSuggestion[] {
    // Don't show generic parameter hints - only real matches should appear
    return [];
  }

  /**
   * Utility method to parse numeric parameters
   */
  protected parseNumber(value: string): number | null {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }

  /**
   * Utility method to parse integer parameters
   */
  protected parseInt(value: string): number | null {
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
  }

  /**
   * Utility method to validate required parameters
   */
  protected validateRequiredParams(args: string[], requiredCount: number): boolean {
    return args.length >= requiredCount;
  }
}

/**
 * Base class for multi-input commands
 */
export abstract class BaseMultiInputCommand extends BaseCommand implements MultiInputCommand {
  abstract enterMultiMode(): Promise<{ prompt: string; data?: unknown }>;
  abstract exitMultiMode(currentData?: unknown): Promise<void>;
  abstract getMultiModeAutocompleteSuggestions(partialInput: string, multiData?: unknown): CommandSuggestion[];
}

/**
 * Result of command execution
 */
export interface CommandResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

/**
 * Utility functions for command parsing
 */
export class CommandUtils {
  /**
   * Check if input is a command (starts with /)
   */
  static isCommand(input: string): boolean {
    return input.trim().startsWith('/');
  }

  /**
   * Parse command input into keyword and arguments
   */
  static parseCommand(input: string): { keyword: string; args: string[] } {
    const trimmed = input.trim();
    if (!trimmed.startsWith('/')) {
      throw new Error('Input is not a command');
    }

    const withoutSlash = trimmed.substring(1);
    const parts = withoutSlash.split(/\s+/);
    const keyword = parts[0].toLowerCase();
    const args = parts.slice(1);

    return { keyword, args };
  }

  /**
   * Check if input is the exit command for multi-mode (just '/')
   */
  static isExitMultiMode(input: string): boolean {
    return input.trim() === '/';
  }

  /**
   * Check if a command supports multi-input mode
   */
  static isMultiInputCommand(command: Command): command is MultiInputCommand {
    return 'enterMultiMode' in command && 'exitMultiMode' in command;
  }
}