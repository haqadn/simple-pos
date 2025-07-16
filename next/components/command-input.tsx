'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@heroui/react';
import { useCommandManager } from '@/hooks/useCommandManager';
import { useCurrentOrder } from '@/stores/orders';
import { useProductsQuery } from '@/stores/products';
import { CommandContext } from '@/commands/command-manager';

interface CommandInputProps {
  onMessage?: (message: string, type: 'success' | 'error') => void;
  updateLineItemQuantity: (productId: number, variationId: number, quantity: number) => Promise<void>;
}

export function CommandInput({ onMessage, updateLineItemQuantity }: CommandInputProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Hooks for data
  const orderQuery = useCurrentOrder();
  const { data: products = [] } = useProductsQuery();
  
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

  // Set up command context when data is available
  useEffect(() => {
    if (isReady && orderQuery.data && products.length > 0) {
      const context: CommandContext = {
        currentOrder: orderQuery.data,
        products,
        updateLineItem: updateLineItemQuantity,
        showMessage: (message: string) => {
          onMessage?.(message, 'success');
          console.log('Command success:', message);
        },
        showError: (error: string) => {
          onMessage?.(error, 'error');
          console.error('Command error:', error);
        }
      };
      
      setContext(context);
    }
  }, [isReady, orderQuery.data, products, updateLineItemQuantity, setContext, onMessage]);

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

  return (
    <div className="w-full space-y-2">
      {/* Status indicator */}
      {multiMode && (
        <div className="text-sm text-gray-500">
          Multi-input mode: {activeCommand} (type '/' to exit)
        </div>
      )}
      
      {/* Command input */}
      <form onSubmit={handleSubmit} className="relative">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={multiMode ? 
            `${prompt} Enter ${activeCommand} parameters...` : 
            "Type commands starting with /"
          }
          startContent={
            <span className="text-gray-500 font-mono text-sm">
              {prompt}
            </span>
          }
          className="font-mono"
          size="lg"
          autoComplete="off"
          autoFocus
        />
        
        {/* Autocomplete suggestions */}
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
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
          `Multi-input mode: Type ${activeCommand} parameters, or "/" to exit`
        ) : (
          'Commands: /add <sku> [qty] | /add (multi-mode) | ↑↓ for history'
        )}
      </div>
    </div>
  );
}