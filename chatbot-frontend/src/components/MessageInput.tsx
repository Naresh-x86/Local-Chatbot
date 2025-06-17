import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send } from 'lucide-react';
import { useTheme } from './ChatHeader';

interface MessageInputProps {
  onSendMessage: (message: string, file?: File) => void;
  disabled?: boolean;
  isTyping?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, disabled, isTyping = false }) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [autoFocusEnabled, setAutoFocusEnabled] = useState(false);
  const { theme } = useTheme();

  const handleSend = () => {
    if (!message.trim()) return; // Only allow sending if there's text

    onSendMessage(message.trim(), selectedFile || undefined);
    setMessage('');
    setSelectedFile(null);

    // Reset file input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Removed the toast notification
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Dynamically adjust height
    const textarea = e.target;
    textarea.style.height = '44px';
    const newHeight = Math.min(textarea.scrollHeight, 150);
    textarea.style.height = `${newHeight}px`;

    // Toggle scrollbar visibility
    textarea.style.overflowY = textarea.scrollHeight > 150 ? 'auto' : 'hidden';
  };

  useEffect(() => {
    // Set initial height and scrollbar behavior on mount
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
      textareaRef.current.style.overflowY = 'hidden';
    }
  }, []);

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  React.useEffect(() => {
    if (disabled || !autoFocusEnabled) return;

    const handleGlobalKeyDown = (e: Event) => {
      const event = e as unknown as KeyboardEvent;
      if (
        event.ctrlKey || event.altKey || event.metaKey ||
        document.activeElement === textareaRef.current
      ) return;

      if (event.key.length === 1 && !event.repeat) {
        textareaRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [disabled, autoFocusEnabled]);

  const getPlaceholderText = () => {
    if (disabled && isTyping) {
      return "Please wait while the bot responds to your prompt...";
    }
    if (disabled) {
      return "Please select a model and conversation to start chatting...";
    }
    return "Type your message... (Shift+Enter for new line)";
  };

  return (
    <div className={theme === 'dark'
      ? "border-t border-neutral-800 bg-gradient-to-br from-neutral-950 via-neutral-925 to-neutral-950 p-4 shadow-lg"
      : "border-t border-gray-200 bg-gradient-to-br from-gray-100 to-gray-100 p-4 shadow-lg"}>
      <div className="max-w-4xl mx-auto">
        {selectedFile && (
          <div className={theme === 'dark'
            ? "mb-2 flex items-center justify-between bg-neutral-900 rounded-lg p-2 shadow"
            : "mb-2 flex items-center justify-between bg-gray-100 rounded-lg p-2 shadow"}>
            <div className="flex items-center space-x-2">
              <Paperclip className={theme === 'dark' ? "h-4 w-4 text-neutral-400" : "h-4 w-4 text-gray-500"} />
              <span className={theme === 'dark' ? "text-sm text-neutral-200 truncate" : "text-sm text-gray-800 truncate"}>{selectedFile.name}</span>
              <span className={theme === 'dark' ? "text-xs text-neutral-500" : "text-xs text-gray-500"}>
                ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              className={theme === 'dark'
                ? "text-neutral-400 hover:text-red-400"
                : "text-gray-500 hover:text-red-500"}
            >
              ×
            </Button>
          </div>
        )}

        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyPress={handleKeyPress}
              placeholder={getPlaceholderText()}
              className={theme === 'dark'
                ? "resize-none min-h-[44px] max-h-[150px] pr-12 bg-neutral-900 border-neutral-800 focus:border-neutral-700 focus:ring-neutral-700 text-base text-neutral-100 placeholder-neutral-500 shadow"
                : "resize-none min-h-[44px] max-h-[150px] pr-12 bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-400 text-base text-gray-900 placeholder-gray-500 shadow"}
              disabled={disabled}
            />
          </div>

          <div className="flex space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="*"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className={theme === 'dark'
                ? "h-11 w-11 p-0 bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800"
                : "h-11 w-11 p-0 bg-white border-gray-200 text-gray-500 hover:bg-gray-100"}
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            <Button
              onClick={handleSend}
              disabled={disabled || !message.trim()}
              className={theme === 'dark'
                ? "h-11 w-11 p-0 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 shadow"
                : "h-11 w-11 p-0 bg-gray-200 hover:bg-gray-300 text-gray-800 shadow"}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageInput;
