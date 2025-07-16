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

      // Handle commands (start with /)
      if (CommandUtils.isCommand(trimmedInput)) {
        return await this.executeCommand(trimmedInput, currentState);
      }

      // Handle multi-input mode
      if (currentState.mode === 'multi') {
        return await this.handleMultiInput(trimmedInput, currentState);
      }

      // Not a command and not in multi-mode
      return {
        success: false,
        error: 'Invalid input. Commands must start with /'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
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

    // Exit current multi-mode if switching to a different command
    if (currentState.mode === 'multi' && currentState.activeCommand !== keyword) {
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
    await command.execute(args);
    return {
      success: true,
      message: `Command ${keyword} executed successfully`,
      newState: currentState.mode === 'multi' ? currentState : { mode: 'normal' }
    };
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

    // For commands (starting with /)
    if (CommandUtils.isCommand(trimmedInput)) {
      return this.getCommandSuggestions(trimmedInput);
    }

    // For non-commands, suggest starting with /
    if (trimmedInput.length > 0) {
      return [{
        text: '/' + trimmedInput,
        description: 'Commands must start with /',
        insertText: '/' + trimmedInput,
        type: 'command'
      }];
    }

    // Empty input - suggest all commands
    return this.getAllCommandSuggestions();
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