import { useState, useCallback } from 'react';

export interface CommandMessage {
  id: number;
  text: string;
  type: 'success' | 'error';
}

/**
 * Hook to manage command feedback messages (toast-style notifications).
 *
 * Provides a message queue with automatic 3-second auto-dismiss.
 */
export function useCommandMessages() {
  const [messages, setMessages] = useState<CommandMessage[]>([]);

  const showCommandMessage = useCallback((text: string | unknown, type: 'success' | 'error') => {
    const id = Date.now();
    const message = typeof text === 'string' ? text : (text instanceof Error ? text.message : String(text));
    setMessages(prev => [...prev, { id, text: message, type }]);
    setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== id));
    }, 3000);
  }, []);

  return { messages, showCommandMessage };
}
