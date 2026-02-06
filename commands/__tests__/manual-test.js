// Manual test to debug the autocomplete loop issue
const { CommandRegistry } = require('../command-registry');
const { AddBySKUCommand } = require('../add-by-sku');

function runTests() {
  console.log('🧪 Testing autocomplete behavior...\n');

  const registry = new CommandRegistry();
  
  const mockContext = {
    currentOrder: { id: 1, line_items: [] },
    products: [
      { sku: 'ABC123', name: 'Product ABC', price: 10, product_id: 1, variation_id: 0 },
      { sku: 'DEF456', name: 'Product DEF', price: 20, product_id: 2, variation_id: 0 }
    ],
    updateLineItem: () => {},
    showMessage: () => {},
    showError: () => {}
  };

  const addCommand = new AddBySKUCommand(mockContext);
  registry.registerCommand(addCommand);

  // Test 1: Type "add"
  console.log('🔍 Test 1: Input "add"');
  let suggestions = registry.getAutocompleteSuggestions('add', { mode: 'normal' });
  console.log('Suggestions:', suggestions.map(s => ({ text: s.text, insertText: s.insertText, type: s.type })));
  
  if (suggestions.length === 0) {
    console.log('❌ No suggestions for "add"');
    return;
  }

  // Test 2: Simulate Tab completion
  console.log('\n🔍 Test 2: After Tab completion (simulate "/add ")');
  const tabResult = suggestions[0].insertText; // This should be "/add "
  console.log('Tab completion result:', JSON.stringify(tabResult));
  
  suggestions = registry.getAutocompleteSuggestions(tabResult, { mode: 'normal' });
  console.log('Suggestions after tab:', suggestions.map(s => ({ text: s.text, insertText: s.insertText, type: s.type })));
  
  // Check for loop
  const hasAddSuggestion = suggestions.some(s => s.text === 'add' || s.text === '/add');
  if (hasAddSuggestion) {
    console.log('❌ LOOP DETECTED: Still suggesting "add" after completion');
  } else {
    console.log('✅ No loop: Not suggesting "add" after completion');
  }

  // Test 3: Parameter input
  console.log('\n🔍 Test 3: Parameter input "/add A"');
  suggestions = registry.getAutocompleteSuggestions('/add A', { mode: 'normal' });
  console.log('Parameter suggestions:', suggestions.map(s => ({ text: s.text, type: s.type })));

  console.log('\n🏁 Test complete');
}

// Run the tests
try {
  runTests();
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
}