'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Input } from '@heroui/react';
import { useCommandManager } from '@/hooks/useCommandManager';
import { useCurrentOrder } from '@/stores/orders';
import { useProductsQuery, useGetProductById } from '@/stores/products';
import { CommandContext } from '@/commands/command-manager';

export default function CommandBar() {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Hooks for data
  const orderQuery = useCurrentOrder();
  const { data: products = [] } = useProductsQuery();
  const getProductById = useGetProductById();
  
  // Command manager
  const {
    isReady,
    setContext,
    processInput,
    getAutocompleteSuggestions,
    navigateHistory,
    getPrompt,
    isInMultiMode,
    getActiveCommand
  } = useCommandManager();

  // Handle adding products to the order
  const handleAddProduct = useCallback(async (productId: number, variationId: number, quantity: number) => {
    try {
      const product = getProductById(productId, variationId);
      
      if (!product) {
        throw new Error(`Product not found: ${productId}/${variationId}`);
      }

      if (!orderQuery.data) {
        throw new Error('No active order');
      }

      // Find existing line items for this product
      const existingLineItems = orderQuery.data.line_items.filter(
        li => li.product_id === productId && li.variation_id === variationId
      );
      
      // Calculate current quantity
      const currentQuantity = existingLineItems.reduce((sum, li) => sum + li.quantity, 0);
      const newQuantity = currentQuantity + quantity;

      // Call the API directly
      const OrdersAPI = (await import('@/api/orders')).default;
      
      // Prepare line items for the update
      const lineItems = [];
      
      // Remove existing items (set quantity to 0)
      existingLineItems.forEach(li => {
        if (li.id) {
          lineItems.push({ ...li, quantity: 0 });
        }
      });
      
      // Add new item with total quantity
      if (newQuantity > 0) {
        lineItems.push({
          name: product.name + (product.variation_name ? ` - ${product.variation_name}` : ''),
          product_id: productId,
          variation_id: variationId,
          quantity: newQuantity,
          id: undefined,
        });
      }
      
      // Update the order
      await OrdersAPI.updateOrder(orderQuery.data.id.toString(), {
        line_items: lineItems
      });
      
      // Refetch the order data
      await orderQuery.refetch();
      
    } catch (error) {
      // Silently fail - no notifications
      console.error('Failed to add product:', error);
      throw error;
    }
  }, [orderQuery, getProductById]);

  // Create the command context
  const commandContext = useMemo((): CommandContext | null => {
    if (!orderQuery.data || !products.length) {
      return null;
    }
    
    return {
      currentOrder: orderQuery.data,
      products,
      updateLineItem: handleAddProduct,
      showMessage: () => {}, // No-op
      showError: () => {} // No-op
    };
  }, [orderQuery.data, products, handleAddProduct]);

  // Set up command context when ready
  useEffect(() => {
    if (isReady && commandContext) {
      setContext(commandContext);
    }
  }, [isReady, commandContext, setContext]);

  // Update suggestions when input changes
  useEffect(() => {
    if (input.trim()) {
      const commandSuggestions = getAutocompleteSuggestions(input);
      setSuggestions(commandSuggestions.map(s => s.insertText));
    } else {
      setSuggestions([]);
    }
    setSelectedSuggestion(-1);
  }, [input, getAutocompleteSuggestions]);

  // Handle input submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;

    try {
      const result = await processInput(input.trim());
      
      if (result.success) {
        setInput('');
        setSuggestions([]);
        setSelectedSuggestion(-1);
      }
    } catch (error) {
      console.error('Command execution error:', error);
      // No user notification - silent failure
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (suggestions.length > 0) {
          setSelectedSuggestion(prev => 
            prev <= 0 ? suggestions.length - 1 : prev - 1
          );
        } else {
          // Navigate command history
          const historyItem = navigateHistory('up');
          if (historyItem !== null) {
            setInput(historyItem);
          }
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (suggestions.length > 0) {
          setSelectedSuggestion(prev => 
            prev >= suggestions.length - 1 ? -1 : prev + 1
          );
        } else {
          // Navigate command history
          const historyItem = navigateHistory('down');
          if (historyItem !== null) {
            setInput(historyItem);
          }
        }
        break;

      case 'Tab':
        e.preventDefault();
        if (selectedSuggestion >= 0 && suggestions[selectedSuggestion]) {
          setInput(suggestions[selectedSuggestion]);
          setSuggestions([]);
          setSelectedSuggestion(-1);
        }
        break;

      case 'Escape':
        setSuggestions([]);
        setSelectedSuggestion(-1);
        break;
    }
  };

  // Get current prompt
  const prompt = getPrompt();
  const multiMode = isInMultiMode();
  const activeCommand = getActiveCommand();

  if (!isReady || !commandContext) {
    return (
      <Input 
        classNames={{ 
          mainWrapper: 'w-full',
        }} 
        labelPlacement="outside-left" 
        label="Command"
        aria-label="Loading command system..."
        placeholder="Loading..."
        disabled
      />
    );
  }

  return (
    <div className="w-full space-y-2">
      {/* Command input */}
      <form onSubmit={handleSubmit} className="relative">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          classNames={{ 
            mainWrapper: 'w-full',
          }}
          labelPlacement="outside-left"
          label="Command"
          placeholder={multiMode ? 
            `Enter ${activeCommand} parameters...` : 
            "Type commands starting with /"
          }
          startContent={
            <span className="text-gray-500 font-mono text-sm min-w-fit">
              {prompt}
            </span>
          }
          className="font-mono"
          autoComplete="off"
          aria-label="Command input field"
        />
        
        {/* Autocomplete suggestions */}
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto mt-1">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`px-3 py-2 cursor-pointer text-sm font-mono ${
                  index === selectedSuggestion 
                    ? 'bg-blue-100 text-blue-900' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => {
                  setInput(suggestion);
                  setSuggestions([]);
                  setSelectedSuggestion(-1);
                  inputRef.current?.focus();
                }}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </form>
      
      {/* Help text */}
      <div className="text-xs text-gray-400">
        {multiMode ? (
          `Multi-input mode: Type ${activeCommand} parameters, or &quot;/&quot; to exit`
        ) : (
          'Commands: /add <sku> [qty] | /add (multi-mode) | ↑↓ for history'
        )}
      </div>
    </div>
  );
}