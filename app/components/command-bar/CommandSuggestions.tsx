'use client';

import { RefObject } from 'react';
import { CommandSuggestion } from '@/commands/command';

interface CommandSuggestionsProps {
  suggestions: CommandSuggestion[];
  selectedIndex: number;
  suggestionsRef: RefObject<HTMLDivElement | null>;
  onSelect: (suggestion: CommandSuggestion) => void;
}

export function CommandSuggestions({
  suggestions,
  selectedIndex,
  suggestionsRef,
  onSelect,
}: CommandSuggestionsProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div
      ref={suggestionsRef}
      className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto mt-1"
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={index}
          className={`px-3 py-2 cursor-pointer text-sm ${
            index === selectedIndex
              ? 'bg-blue-100 text-blue-900'
              : 'hover:bg-gray-100'
          }`}
          onClick={() => onSelect(suggestion)}
        >
          <div className="font-mono">{suggestion.text}</div>
          {suggestion.description && (
            <div className="text-xs text-gray-500">{suggestion.description}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Apply a suggestion to the current input
 */
export function applySuggestion(
  suggestion: CommandSuggestion,
  currentInput: string
): string {
  if (suggestion.type === 'command') {
    // For command suggestions, replace the entire input
    return suggestion.insertText;
  } else {
    // For parameters, replace the current word being typed
    const inputParts = currentInput.split(' ');
    const lastPartIndex = inputParts.length - 1;
    inputParts[lastPartIndex] = suggestion.text;
    return inputParts.join(' ');
  }
}
