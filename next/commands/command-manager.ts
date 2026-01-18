import { CommandRegistry, CommandExecutionResult } from './command-registry';
import { CommandState, CommandSuggestion } from './command';
import { ItemCommand } from './item';
import { ClearCommand } from './clear';
import { PayCommand } from './pay';
import { DoneCommand } from './done';
import { CouponCommand } from './coupon';
import { PrintCommand } from './print';
import { NoteCommand } from './note';
import { CustomerCommand, CustomerData } from './customer';
import { DrawerCommand } from './drawer';
import { StockCommand } from './stock';
export type { CustomerData };

import { OrderSchema } from '@/api/orders';
import { ProductSchema } from '@/stores/products';

/**
 * Currency configuration for formatting
 */
export interface CurrencyConfig {
  symbol: string;
  position: 'left' | 'right' | 'left_space' | 'right_space';
}

/**
 * Command context that provides data and functions to commands
 */
export interface CommandContext {
  // Order data
  currentOrder?: OrderSchema;

  // Product data
  products: ProductSchema[];

  // Line item operations
  updateLineItem: (productId: number, variationId: number, quantity: number, mode: 'set' | 'increment') => Promise<void>;

  // Order operations
  clearOrder: () => Promise<void>;
  completeOrder: () => Promise<void>;

  // Payment operations
  setPayment: (amount: number) => Promise<void>;
  getPaymentReceived?: () => number;

  // Coupon operations
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;

  // Print operations
  print: (type: 'bill' | 'kot') => Promise<void>;
  openDrawer: () => Promise<void>;

  // Stock operations
  invalidateProducts?: () => Promise<void>;

  // Customer operations
  setNote: (note: string) => Promise<void>;
  setCustomer: (customer: CustomerData) => Promise<void>;

  // Navigation
  navigateToNextOrder?: () => void;

  // Currency formatting
  getCurrency?: () => CurrencyConfig;

  // UI feedback functions
  showMessage: (message: string) => void;
  showError: (error: string) => void;
}

/**
 * Main command manager that coordinates the command system
 */
export class CommandManager {
  private registry: CommandRegistry;
  private context?: CommandContext;
  private state: CommandState = { mode: 'normal' };
  private history: string[] = [];
  private historyIndex = -1;

  constructor(initialState?: CommandState) {
    this.registry = new CommandRegistry();
    this.registerDefaultCommands();

    // Restore persisted state if provided
    if (initialState) {
      this.state = initialState;
    }
  }

  /**
   * Set the command context (called by React components)
   */
  setContext(context: CommandContext): void {
    this.context = context;
    this.updateCommandContexts();
  }

  /**
   * Get the current command state
   */
  getState(): CommandState {
    return this.state;
  }

  /**
   * Process user input
   */
  async processInput(input: string): Promise<CommandExecutionResult> {
    if (!this.context) {
      return {
        success: false,
        error: 'Command context not initialized'
      };
    }

    // Add to history if not empty and different from last entry
    if (input.trim() && input !== this.history[this.history.length - 1]) {
      this.history.push(input);
      // Keep history limited to 100 entries
      if (this.history.length > 100) {
        this.history.shift();
      }
    }
    this.historyIndex = -1; // Reset history navigation

    try {
      const result = await this.registry.processInput(input, this.state);
      
      // Update state if provided
      if (result.newState) {
        this.state = result.newState;
      }

      // Show feedback
      if (result.success && result.message) {
        this.context.showMessage(result.message);
      } else if (!result.success && result.error) {
        this.context.showError(result.error);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.context.showError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get autocomplete suggestions
   */
  getAutocompleteSuggestions(partialInput: string): CommandSuggestion[] {
    return this.registry.getAutocompleteSuggestions(partialInput, this.state);
  }

  /**
   * Navigate command history
   */
  navigateHistory(direction: 'up' | 'down'): string | null {
    if (this.history.length === 0) return null;

    if (direction === 'up') {
      if (this.historyIndex === -1) {
        this.historyIndex = this.history.length - 1;
      } else if (this.historyIndex > 0) {
        this.historyIndex--;
      }
    } else { // down
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
      } else {
        this.historyIndex = -1;
        return ''; // Clear input when going past the end
      }
    }

    return this.historyIndex >= 0 ? this.history[this.historyIndex] : null;
  }

  /**
   * Get help for commands
   */
  getHelp(commandKeyword?: string): string {
    return this.registry.getHelp(commandKeyword);
  }

  /**
   * Reset command state (useful for error recovery)
   */
  reset(): void {
    this.state = { mode: 'normal' };
  }

  /**
   * Cleanup all commands (call when manager is destroyed)
   */
  dispose(): void {
    this.registry.getAllCommands().forEach(command => {
      if (command.dispose) {
        command.dispose();
      }
    });
    this.context = undefined;
    this.history = [];
  }

  /**
   * Register default commands
   */
  private registerDefaultCommands(): void {
    this.registry.registerCommand(new ItemCommand());
    this.registry.registerCommand(new ClearCommand());
    this.registry.registerCommand(new PayCommand());
    this.registry.registerCommand(new DoneCommand());
    this.registry.registerCommand(new CouponCommand());
    this.registry.registerCommand(new PrintCommand());
    this.registry.registerCommand(new NoteCommand());
    this.registry.registerCommand(new CustomerCommand());
    this.registry.registerCommand(new DrawerCommand());
    this.registry.registerCommand(new StockCommand());
  }

  /**
   * Update command contexts when context changes
   */
  private updateCommandContexts(): void {
    if (!this.context) return;

    // Update all commands that need context
    this.registry.getAllCommands().forEach(command => {
      if ('setContext' in command && typeof command.setContext === 'function') {
        (command as { setContext: (ctx: CommandContext) => void }).setContext(this.context!);
      }
    });
  }

  /**
   * Get current prompt text
   */
  getPrompt(): string {
    if (this.state.mode === 'multi' && this.state.prompt) {
      return this.state.prompt;
    }
    return '>';
  }

  /**
   * Check if currently in multi-input mode
   */
  isInMultiMode(): boolean {
    return this.state.mode === 'multi';
  }

  /**
   * Get active command in multi-mode
   */
  getActiveCommand(): string | undefined {
    return this.state.activeCommand;
  }
}