
import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService, type Message } from '@/services/api';
import { debugService } from '@/services/debugService';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
  selectedChatId: string | null;
  newMessage: string | null;
  onMessageSent: () => void;
  isTyping: boolean;
  setIsTyping: (typing: boolean) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  selectedChatId, 
  newMessage, 
  onMessageSent, 
  isTyping, 
  setIsTyping 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoadingStates, setImageLoadingStates] = useState<{ [key: string]: boolean }>({});
  const { user, isDebugMode } = useAuth();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedChatId && user) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [selectedChatId, user, isDebugMode]);

  useEffect(() => {
    if (newMessage && selectedChatId) {
      handleSendMessage(newMessage);
      onMessageSent();
    }
  }, [newMessage, selectedChatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const loadMessages = async () => {
    if (!selectedChatId || !user) return;

    setIsLoading(true);
    try {
      const response = isDebugMode
        ? await debugService.getChatMessages(selectedChatId)
        : await apiService.getChatMessages(selectedChatId, user.token);
      setMessages(response.messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (text: string, file?: File) => {
    if (!selectedChatId || !user || !text.trim()) return;

    // Add user message immediately
    const userMessage: Message = {
      id: `temp_${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const botResponse = isDebugMode
        ? await debugService.sendMessage(selectedChatId, text, file)
        : await apiService.sendMessage(selectedChatId, text, user.token, file);

      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove the temporary user message on error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setIsTyping(false);
    }
  };

  const formatMessage = (text: string) => {
    // Simple markdown formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/\n/g, '<br>');
  };

  const handleImageLoad = (messageId: string) => {
    setImageLoadingStates(prev => ({ ...prev, [messageId]: false }));
  };

  const handleImageStart = (messageId: string) => {
    setImageLoadingStates(prev => ({ ...prev, [messageId]: true }));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Message copied to clipboard",
      });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const WelcomeMessage = () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <span className="text-white text-3xl">💬</span>
        </div>
        <h3 className="text-2xl font-semibold text-gray-800 mb-3">Start your conversation</h3>
        <p className="text-gray-500 leading-relaxed">
          Ask me anything! I'm here to help with questions, provide information, or just have a friendly chat.
        </p>
        <div className="mt-6 flex justify-center space-x-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );

  if (!selectedChatId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-500 text-2xl">💬</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No chat selected</h3>
          <p className="text-gray-500">Choose a chat from the sidebar or create a new one to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse text-gray-500">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full min-h-[60vh] flex items-center justify-center">
              <WelcomeMessage />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      "flex max-w-[80%] space-x-3",
                      message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                    )}
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      {message.sender === 'user' ? (
                        <>
                          <AvatarImage src={user?.profile_pic} alt={user?.username} />
                          <AvatarFallback className="bg-blue-500 text-white">
                            {user?.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </>
                      ) : (
                        <AvatarFallback className="bg-gray-500 text-white">
                          AI
                        </AvatarFallback>
                      )}
                    </Avatar>

                    <div className="flex flex-col space-y-2">
                      {message.sender === 'user' ? (
                        // User message with bubble
                        <div className="bg-blue-600 text-white rounded-lg px-4 py-3 shadow-sm">
                          <p className="text-sm">{message.text}</p>
                        </div>
                      ) : (
                        // Bot message without bubble
                        <div className="space-y-3">
                          {message.image && (
                            <div className="rounded-lg overflow-hidden shadow-sm relative">
                              {imageLoadingStates[message.id] && (
                                <div className="w-64 h-48 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
                                  <div className="text-gray-400">Loading image...</div>
                                </div>
                              )}
                              <img
                                src={message.image}
                                alt="Bot response"
                                className="max-w-xs rounded-lg"
                                onLoadStart={() => handleImageStart(message.id)}
                                onLoad={() => handleImageLoad(message.id)}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  handleImageLoad(message.id);
                                }}
                                style={{ display: imageLoadingStates[message.id] ? 'none' : 'block' }}
                              />
                            </div>
                          )}
                          <div
                            dangerouslySetInnerHTML={{
                              __html: formatMessage(message.text)
                            }}
                            className="prose prose-sm max-w-none text-gray-900"
                          />
                        </div>
                      )}

                      <div className="flex items-center text-xs text-gray-500 px-1">
                        <span>
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {message.sender === 'bot' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-gray-100 ml-2"
                            onClick={() => copyToClipboard(message.text)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex max-w-[80%] space-x-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="bg-gray-500 text-white">
                        AI
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-200">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChatWindow;
