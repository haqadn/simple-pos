import { CommandRegistry } from '../command-registry';
import { AddBySKUCommand } from '../add-by-sku';
import { CommandContext } from '../command-manager';

describe('Autocomplete behavior', () => {
  let registry: CommandRegistry;
  let mockContext: CommandContext;

  beforeEach(() => {
    registry = new CommandRegistry();
    
    mockContext = {
      currentOrder: { id: 1, line_items: [] } as any,
      products: [
        { sku: 'ABC123', name: 'Product ABC', price: 10, product_id: 1, variation_id: 0 },
        { sku: 'DEF456', name: 'Product DEF', price: 20, product_id: 2, variation_id: 0 }
      ] as any,
      updateLineItem: jest.fn(),
      showMessage: jest.fn(),
      showError: jest.fn()
    };

    const addCommand = new AddBySKUCommand(mockContext);
    registry.registerCommand(addCommand);
  });

  describe('Command suggestion loop issue', () => {
    test('typing "add" should suggest "/add"', () => {
      const suggestions = registry.getAutocompleteSuggestions('add', { mode: 'normal' });
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].text).toBe('/add');
      expect(suggestions[0].insertText).toBe('/add ');
      expect(suggestions[0].type).toBe('command');
    });

    test('after tab completion to "/add ", should not suggest "add" again', () => {
      // Simulate tab completion result
      const suggestions = registry.getAutocompleteSuggestions('/add ', { mode: 'normal' });
      
      // Should be empty or contain parameter suggestions, NOT command suggestions
      const commandSuggestions = suggestions.filter(s => s.type === 'command');
      expect(commandSuggestions).toHaveLength(0);
    });

    test('"/add " (with trailing space) should wait for parameters', () => {
      const suggestions = registry.getAutocompleteSuggestions('/add ', { mode: 'normal' });
      
      // Should not suggest any commands that would cause a loop
      const addSuggestions = suggestions.filter(s => 
        s.text.includes('add') && s.type === 'command'
      );
      expect(addSuggestions).toHaveLength(0);
    });

    test('"/add ABC" should suggest product SKUs', () => {
      const suggestions = registry.getAutocompleteSuggestions('/add ABC', { mode: 'normal' });
      
      const skuSuggestions = suggestions.filter(s => s.text === 'ABC123');
      expect(skuSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Tab completion simulation', () => {
    test('full user workflow should not loop', () => {
      // Step 1: User types "add"
      let input = 'add';
      let suggestions = registry.getAutocompleteSuggestions(input, { mode: 'normal' });
      expect(suggestions[0]?.text).toBe('/add');
      
      // Step 2: User presses Tab (simulate tab completion)
      input = suggestions[0].insertText; // "/add "
      
      // Step 3: Check suggestions after tab completion
      suggestions = registry.getAutocompleteSuggestions(input, { mode: 'normal' });
      
      // Should NOT suggest "add" again
      const loopSuggestions = suggestions.filter(s => 
        s.text === 'add' || s.text === '/add'
      );
      expect(loopSuggestions).toHaveLength(0);
    });

    test('empty input after command should not show command suggestions', () => {
      const suggestions = registry.getAutocompleteSuggestions('/add ', { mode: 'normal' });
      
      // When a command is complete (ends with space), should not show command completions
      expect(suggestions.every(s => s.type !== 'command')).toBe(true);
    });
  });

  describe('Parameter suggestions', () => {
    test('"/add A" should suggest matching SKUs', () => {
      const suggestions = registry.getAutocompleteSuggestions('/add A', { mode: 'normal' });
      
      const abcSuggestion = suggestions.find(s => s.text === 'ABC123');
      expect(abcSuggestion).toBeDefined();
      expect(abcSuggestion?.type).toBe('parameter');
    });

    test('"/add XYZ" with no matches should show no suggestions', () => {
      const suggestions = registry.getAutocompleteSuggestions('/add XYZ', { mode: 'normal' });
      
      // Should not show any suggestions for non-existent SKUs
      expect(suggestions).toHaveLength(0);
    });
  });
});