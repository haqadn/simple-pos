import { Command, CommandState, CommandUtils, CommandSuggestion } from './command';

/**
 * Command execution result
 */
export interface CommandExecutionResult {
  success: boolean;
  message?: string;
  error?: string;
  newState?: CommandState;
}

/**
 * Command registry and parser for the POS system
 */
export class CommandRegistry {
  private commands: Map<string, Command> = new Map();
  private commandInstances: Command[] = [];

  /**
   * Register a command with the registry
   */
  registerCommand(command: Command): void {
    const metadata = command.getMetadata();
    
    // Register primary keyword
    this.commands.set(metadata.keyword.toLowerCase(), command);
    
    // Register aliases
    metadata.aliases?.forEach(alias => {
      this.commands.set(alias.toLowerCase(), command);
    });

    // Keep track of all command instances for suggestions
    if (!this.commandInstances.includes(command)) {
      this.commandInstances.push(command);
    }
  }

  /**
   * Get a command by keyword
   */
  getCommand(keyword: string): Command | undefined {
    return this.commands.get(keyword.toLowerCase());
  }

  /**
   * Get all registered commands
   */
  getAllCommands(): Command[] {
    return this.commandInstances;
  }

  /**
   * Detect input type based on prefix
   */
  private detectInputType(input: string): 'command' | 'item' {
    if (input.startsWith('/')) return 'command';
    return 'item';
  }

  /**
   * Process user input and execute commands or handle multi-input mode
   */
  async processInput(
    input: string,
    currentState: CommandState
  ): Promise<CommandExecutionResult> {
    const trimmedInput = input.trim();

    try {
      // Handle exit from multi-input mode
      if (CommandUtils.isExitMultiMode(trimmedInput)) {
        return await this.exitMultiMode(currentState);
      }

      // Handle multi-input mode first (stays in current command context)
      if (currentState.mode === 'multi') {
        // Allow switching to commands from multi-mode
        if (this.detectInputType(trimmedInput) === 'command') {
          return await this.executeCommand(trimmedInput, currentState);
        }
        // Otherwise process as multi-input
        return await this.handleMultiInput(trimmedInput, currentState);
      }

      // Route based on input type
      const inputType = this.detectInputType(trimmedInput);

      if (inputType === 'command') {
        return await this.executeCommand(trimmedInput, currentState);
      }

      // Default: item entry
      return await this.handleItemEntry(trimmedInput, currentState);

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Handle default item entry (no prefix)
   */
  private async handleItemEntry(
    input: string,
    currentState: CommandState
  ): Promise<CommandExecutionResult> {
    const itemCommand = this.getCommand('item');
    if (!itemCommand) {
      return { success: false, error: 'Item command not registered' };
    }

    const args = input.trim().split(/\s+/);

    try {
      await itemCommand.execute(args);
      return {
        success: true,
        message: `Added: ${args[0]}`,
        newState: currentState
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add item'
      };
    }
  }

  /**
   * Execute a command (starts with /)
   */
  private async executeCommand(
    input: string,
    currentState: CommandState
  ): Promise<CommandExecutionResult> {
    const { keyword, args } = CommandUtils.parseCommand(input);
    const command = this.getCommand(keyword);

    if (!command) {
      return {
        success: false,
        error: `Unknown command: ${keyword}`
      };
    }

    // Track if we're switching from multi-mode to a different command
    const exitingMultiMode = currentState.mode === 'multi' && currentState.activeCommand !== keyword;

    // Exit current multi-mode if switching to a different command
    if (exitingMultiMode) {
      await this.exitCurrentMultiMode(currentState);
    }

    // If no arguments and command supports multi-mode, enter multi-mode
    if (args.length === 0 && CommandUtils.isMultiInputCommand(command)) {
      const result = await command.enterMultiMode();
      return {
        success: true,
        message: `Entered ${keyword} mode`,
        newState: {
          mode: 'multi',
          activeCommand: keyword,
          prompt: result.prompt,
          data: result.data
        }
      };
    }

    // Execute single command
    try {
      await command.execute(args);
      return {
        success: true,
        message: `Command ${keyword} executed successfully`,
        newState: { mode: 'normal' }
      };
    } catch (error) {
      // Even if command fails, we should still exit multi-mode when switching commands
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Command execution failed',
        newState: exitingMultiMode ? { mode: 'normal' } : undefined
      };
    }
  }

  /**
   * Handle input in multi-input mode
   */
  private async handleMultiInput(
    input: string, 
    currentState: CommandState
  ): Promise<CommandExecutionResult> {
    if (!currentState.activeCommand) {
      return {
        success: false,
        error: 'No active multi-input command'
      };
    }

    const command = this.getCommand(currentState.activeCommand);
    if (!command) {
      return {
        success: false,
        error: `Active command not found: ${currentState.activeCommand}`
      };
    }

    // Treat input as: /<activeCommand> <input>
    const args = input.trim().split(/\s+/);
    await command.execute(args);

    return {
      success: true,
      message: `Processed: ${input}`,
      newState: currentState // Stay in multi-mode
    };
  }

  /**
   * Exit multi-input mode
   */
  private async exitMultiMode(currentState: CommandState): Promise<CommandExecutionResult> {
    if (currentState.mode !== 'multi') {
      return {
        success: true,
        message: 'Not in multi-input mode',
        newState: { mode: 'normal' }
      };
    }

    await this.exitCurrentMultiMode(currentState);

    return {
      success: true,
      message: 'Exited multi-input mode',
      newState: { mode: 'normal' }
    };
  }

  /**
   * Helper to exit current multi-mode
   */
  private async exitCurrentMultiMode(currentState: CommandState): Promise<void> {
    if (currentState.mode === 'multi' && currentState.activeCommand) {
      const command = this.getCommand(currentState.activeCommand);
      if (command && CommandUtils.isMultiInputCommand(command)) {
        await command.exitMultiMode(currentState.data);
      }
    }
  }

  /**
   * Get autocomplete suggestions for partial input
   */
  getAutocompleteSuggestions(
    partialInput: string,
    currentState: CommandState
  ): CommandSuggestion[] {
    const trimmedInput = partialInput.trim();

    // In multi-input mode, get suggestions from the active command
    if (currentState.mode === 'multi' && currentState.activeCommand) {
      const command = this.getCommand(currentState.activeCommand);
      if (command && CommandUtils.isMultiInputCommand(command)) {
        return command.getMultiModeAutocompleteSuggestions(trimmedInput, currentState.data);
      }
    }

    // Route based on input type
    if (this.detectInputType(trimmedInput) === 'command') {
      return this.getCommandSuggestions(trimmedInput);
    }

    // Default: show product SKU suggestions
    if (trimmedInput.length > 0) {
      return this.getProductSuggestions(trimmedInput);
    }

    // Empty input - show hint
    return this.getAllCommandSuggestions();
  }

  /**
   * Get product SKU suggestions for item entry
   */
  private getProductSuggestions(partialSku: string): CommandSuggestion[] {
    const itemCommand = this.getCommand('item');
    if (!itemCommand || !CommandUtils.isMultiInputCommand(itemCommand)) {
      return [];
    }

    // Reuse ItemCommand's product matching logic
    return itemCommand.getMultiModeAutocompleteSuggestions(partialSku);
  }

  /**
   * Get suggestions for command input (starts with /)
   */
  private getCommandSuggestions(input: string): CommandSuggestion[] {
    try {
      const { keyword } = CommandUtils.parseCommand(input);
      const command = this.getCommand(keyword);

      if (command) {
        // Command found, get parameter suggestions
        const withoutSlash = input.substring(1);
        return command.getAutocompleteSuggestions(withoutSlash);
      } else {
        // Command not found, suggest matching commands
        return this.getMatchingCommandSuggestions(keyword);
      }
    } catch {
      // Invalid command format, suggest all commands
      return this.getAllCommandSuggestions();
    }
  }

  /**
   * Get command suggestions that match the keyword
   */
  private getMatchingCommandSuggestions(partialKeyword: string): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];
    const lowerKeyword = partialKeyword.toLowerCase();

    this.commandInstances.forEach(command => {
      const metadata = command.getMetadata();
      
      // Check primary keyword
      if (metadata.keyword.startsWith(lowerKeyword)) {
        suggestions.push({
          text: '/' + metadata.keyword,
          description: metadata.description,
          insertText: '/' + metadata.keyword + ' ',
          type: 'command'
        });
      }

      // Check aliases
      metadata.aliases?.forEach(alias => {
        if (alias.startsWith(lowerKeyword)) {
          suggestions.push({
            text: '/' + alias,
            description: `${metadata.description} (alias)`,
            insertText: '/' + alias + ' ',
            type: 'command'
          });
        }
      });
    });

    return suggestions;
  }

  /**
   * Get all command suggestions
   */
  private getAllCommandSuggestions(): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];

    this.commandInstances.forEach(command => {
      const metadata = command.getMetadata();
      suggestions.push({
        text: '/' + metadata.keyword,
        description: metadata.description,
        insertText: '/' + metadata.keyword + ' ',
        type: 'command'
      });
    });

    return suggestions.sort((a, b) => a.text.localeCompare(b.text));
  }

  /**
   * Get help text for all commands or a specific command
   */
  getHelp(commandKeyword?: string): string {
    if (commandKeyword) {
      const command = this.getCommand(commandKeyword);
      if (command) {
        const metadata = command.getMetadata();
        return `${metadata.keyword}: ${metadata.description}\nUsage:\n${metadata.usage.join('\n')}`;
      }
      return `Command not found: ${commandKeyword}`;
    }

    // Return help for all commands
    const helpLines: string[] = ['Available commands:'];
    this.commandInstances.forEach(command => {
      const metadata = command.getMetadata();
      const aliases = metadata.aliases ? ` (${metadata.aliases.join(', ')})` : '';
      helpLines.push(`  /${metadata.keyword}${aliases} - ${metadata.description}`);
    });

    return helpLines.join('\n');
  }
}
