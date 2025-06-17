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
import ImagePreviewModal from '@/components/ImagePreviewModal';
import AttachmentIndicator from '@/components/AttachmentIndicator';
import { useTheme } from './ChatHeader';
import { motion } from 'framer-motion';

interface ChatWindowProps {
  selectedChatId: string | null;
  newMessage: string | null;
  newFile?: File | null;
  onMessageSent: () => void;
  isTyping: boolean;
  setIsTyping: (typing: boolean) => void;
  selectedModel: string | null;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  selectedChatId, 
  newMessage, 
  newFile,
  onMessageSent, 
  isTyping, 
  setIsTyping,
  selectedModel 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoadingStates, setImageLoadingStates] = useState<{ [key: string]: boolean }>({});
  const [imagePreview, setImagePreview] = useState<{ isOpen: boolean; imageUrl: string }>({
    isOpen: false,
    imageUrl: ''
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadingMessageId, setCurrentUploadingMessageId] = useState<string | null>(null);
  const { user, isDebugMode } = useAuth();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [typingText, setTypingText] = useState<{[messageId: string]: string}>({});
  const [fullText, setFullText] = useState<{[messageId: string]: string}>({});
  const [animatedMessageIds, setAnimatedMessageIds] = useState<string[]>([]);
  const [completedAnimations, setCompletedAnimations] = useState<string[]>([]);

  useEffect(() => {
    if (selectedChatId && user) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [selectedChatId, user, isDebugMode]);

  useEffect(() => {
    if (newMessage && selectedChatId) {
      handleSendMessage(newMessage, newFile || undefined);
      onMessageSent();
    }
  }, [newMessage, selectedChatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = (smooth = true) => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
    });
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

    // Generate unique ID for this message
    const messageId = `temp_${Date.now()}`;
    
    // Add user message immediately
    const userMessage: Message = {
      id: messageId,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toISOString(),
      ...(file && {
        file: {
          filename: file.name,
          stored_as: '',
          content_type: file.type,
          size: file.size
        }
      })
    };

    setMessages(prev => [...prev, userMessage]);
    setAnimatedMessageIds(prev => [...prev, userMessage.id]); // Add user message ID immediately

    // Set up upload tracking if file exists
    if (file) {
      setCurrentUploadingMessageId(messageId);
      setUploadProgress(0);
      setIsTyping(true); // <-- Start typing indicator immediately on file upload
    } else {
      setIsTyping(true); // For text-only messages, also start typing
    }

    const onUploadProgress = (progress: number) => {
      setUploadProgress(progress);
    };

    try {
      const botResponse = isDebugMode
        ? await debugService.sendMessage(selectedChatId, text, file, onUploadProgress)
        : await apiService.sendMessage(selectedChatId, text, user.token, file, selectedModel || undefined, onUploadProgress);

      // For file uploads, clear upload state after upload is complete
      if (file) {
        setUploadProgress(100);
        setTimeout(() => {
          setCurrentUploadingMessageId(null);
          setUploadProgress(0);
        }, 500);

        setTimeout(() => {
          setMessages(prev => [...prev, botResponse]);
          setIsTyping(false);
          setAnimatedMessageIds(prev => [...prev, botResponse.id]); // Only add bot ID
        }, 1000);
      } else {
        setMessages(prev => [...prev, botResponse]);
        setIsTyping(false);
        setAnimatedMessageIds(prev => [...prev, botResponse.id]); // Only add bot ID
      }

      // Typing animation
      setFullText(prev => ({ ...prev, [botResponse.id]: botResponse.text }));
      setTypingText(prev => ({ ...prev, [botResponse.id]: '' }));
      let index = 0;
      const intervalId = setInterval(() => {
        setTypingText(prev => {
          const newText = botResponse.text.substring(0, index);
          if (prev[botResponse.id] !== newText) {
            scrollToBottom();
          }
          return { ...prev, [botResponse.id]: newText };
        });
        index++;
        if (index > botResponse.text.length) {
          clearInterval(intervalId);
          setCompletedAnimations(prev => [...prev, botResponse.id]);
          scrollToBottom();
        }
      }, 20);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove the temporary user message on error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
      
      // Add error message
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        sender: 'bot',
        text: '<code style="color: red;">Server error: Failed to fetch messages.</code>',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Reset all states
      setCurrentUploadingMessageId(null);
      setUploadProgress(0);
      setIsTyping(false);
      setTypingText({});
      setFullText({});
    }
  };

  const formatMessage = (text: string) => {
    // Simple markdown formatting, use only 'dark-code-block' for code blocks
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 rounded text-sm dark-code-block">$1</code>')
      .replace(/\n/g, '<br>');
  };

  const handleImageLoad = (messageId: string) => {
    setImageLoadingStates(prev => ({ ...prev, [messageId]: false }));
    scrollToBottom();
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

  const openImagePreview = (imageUrl: string) => {
    setImagePreview({ isOpen: true, imageUrl });
  };

  const WelcomeMessage = () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto">
        <div className={theme === 'dark'
          ? "w-20 h-20 bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
          : "w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"}>
          <span className={theme === 'dark' ? "text-neutral-200 text-3xl" : "text-gray-700 text-3xl"}>💬</span>
        </div>
        <h3 className={theme === 'dark'
          ? "text-2xl font-semibold text-neutral-100 mb-3"
          : "text-2xl font-semibold text-gray-900 mb-3"}>Start your conversation</h3>
        <p className={theme === 'dark'
          ? "text-neutral-400 leading-relaxed"
          : "text-gray-500 leading-relaxed"}>
          Ask me anything! I'm here to help with questions, provide information, or just have a friendly chat.
        </p>
        <div className="mt-6 flex justify-center space-x-2">
          <div className={theme === 'dark'
            ? "w-2 h-2 bg-neutral-600 rounded-full animate-pulse"
            : "w-2 h-2 bg-gray-300 rounded-full animate-pulse"}></div>
          <div className={theme === 'dark'
            ? "w-2 h-2 bg-neutral-700 rounded-full animate-pulse"
            : "w-2 h-2 bg-gray-400 rounded-full animate-pulse"} style={{ animationDelay: '0.2s' }}></div>
          <div className={theme === 'dark'
            ? "w-2 h-2 bg-neutral-600 rounded-full animate-pulse"
            : "w-2 h-2 bg-gray-300 rounded-full animate-pulse"} style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );

  if (!selectedChatId) {
    return (
      <div className={theme === 'dark'
        ? "flex-1 flex items-center justify-center bg-neutral-950"
        : "flex-1 flex items-center justify-center bg-gray-100"}>
        <div className="text-center">
          <div className={theme === 'dark'
            ? "w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-4"
            : "w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4"}>
            <span className={theme === 'dark'
              ? "text-neutral-600 text-2xl"
              : "text-gray-400 text-2xl"}>💬</span>
          </div>
          <h3 className={theme === 'dark'
            ? "text-lg font-medium text-neutral-100 mb-2"
            : "text-lg font-medium text-gray-900 mb-2"}>No chat selected</h3>
          <p className={theme === 'dark'
            ? "text-neutral-500"
            : "text-gray-500"}>Choose a chat from the sidebar or create a new one to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Robust style for dark mode code blocks */}
      <style>
        {`
          .dark .dark-code-block,
          [data-theme="dark"] .dark-code-block {
            background-color: #23272e !important;
            color: #e5e7eb !important;
          }
          .dark .dark-code-block,
          [data-theme="dark"] .dark-code-block {
            border-radius: 0.25rem;
            padding: 0.15em 0.4em;
          }
        `}
      </style>
      <div className={theme === 'dark'
        ? "flex-1 flex flex-col overflow-hidden bg-neutral-900"
        : "flex-1 flex flex-col overflow-hidden bg-gray-50"}>
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className={theme === 'dark'
                  ? "animate-pulse text-neutral-500"
                  : "animate-pulse text-gray-500"}>Loading messages...</div>
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
                      "flex flex-col",
                      message.sender === 'user' ? 'items-end' : 'items-start'
                    )}
                  >
                    <div
                      className={cn(
                        "flex max-w-[80%]",
                        message.sender === 'user'
                          ? 'flex-row-reverse space-x-reverse space-x-3'
                          : 'flex-row space-x-3'
                      )}
                    >
                      <Avatar className="w-8 h-8 flex-shrink-0 self-start">
                        {message.sender === 'user' ? (
                          <>
                            <AvatarImage src={user?.profile_pic} alt={user?.username} />
                            <AvatarFallback className={theme === 'dark'
                              ? "bg-neutral-700 text-neutral-200"
                              : "bg-gray-300 text-gray-800"}>
                              {user?.username?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </>
                        ) : (
                          <AvatarFallback className={theme === 'dark'
                            ? "bg-neutral-800 text-neutral-300"
                            : "bg-gray-200 text-gray-600"}>
                            AI
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex flex-col space-y-2 justify-start" style={message.sender === 'bot' ? { marginTop: '4px' } : {}}>
                        {message.sender === 'user' ? (
                          animatedMessageIds.includes(message.id) ? (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <div className="flex flex-col items-end space-y-1">
                                {message.file && (
                                  <AttachmentIndicator 
                                    file={message.file} 
                                    isUploading={currentUploadingMessageId === message.id}
                                    uploadProgress={currentUploadingMessageId === message.id ? uploadProgress : 100}
                                  />
                                )}
                                <div className={theme === 'dark'
                                  ? "bg-gradient-to-br from-neutral-800 to-neutral-900 text-neutral-100 rounded-lg px-4 py-3 shadow-md"
                                  : "bg-gradient-to-br from-gray-100 to-gray-50 text-gray-900 rounded-lg px-4 py-3 shadow-md"}>
                                  <p className="text-sm" style={{ fontSize: '15px' }}>{message.text}</p>
                                </div>
                              </div>
                            </motion.div>
                          ) : (
                            <div className="flex flex-col items-end space-y-1">
                              {message.file && (
                                <AttachmentIndicator 
                                  file={message.file} 
                                  isUploading={currentUploadingMessageId === message.id}
                                  uploadProgress={currentUploadingMessageId === message.id ? uploadProgress : 100}
                                />
                              )}
                              <div className={theme === 'dark'
                                ? "bg-gradient-to-br from-neutral-800 to-neutral-900 text-neutral-100 rounded-lg px-4 py-3 shadow-md"
                                : "bg-gradient-to-br from-gray-100 to-gray-50 text-gray-900 rounded-lg px-4 py-3 shadow-md"}>
                                <p className="text-sm" style={{ fontSize: '15px' }}>{message.text}</p>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="space-y-3">
                            {message.image && (
                              <div className="rounded-lg cursor-pointer" onClick={() => openImagePreview(message.image!)}>
                                {imageLoadingStates[message.id] && (
                                  <div className={theme === 'dark'
                                    ? "w-64 h-48 bg-neutral-900 animate-pulse rounded-lg flex items-center justify-center"
                                    : "w-64 h-48 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center"}>
                                    <div className={theme === 'dark'
                                      ? "text-neutral-700"
                                      : "text-gray-400"}>Loading image...</div>
                                  </div>
                                )}
                                <img
                                  src={message.image}
                                  alt="Bot response"
                                  className="max-w-xs rounded-lg hover:opacity-90 transition-opacity shadow-lg"
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
                                __html: formatMessage(animatedMessageIds.includes(message.id) && typingText[message.id] !== undefined ? formatMessage(typingText[message.id]) : formatMessage(message.text))
                              }}
                              className={cn(
                                "prose prose-sm max-w-none",
                              )}
                              style={{
                                background: 'none',
                                color: theme === 'dark' ? '#e5e7eb' : '#22292f',
                                padding: 0,
                                borderRadius: 0,
                                boxShadow: 'none'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Timestamp below, aligned to extremes */}
                    {message.sender === 'user' && <div style={{ height: 6 }} />}
                    <div
                      className={cn(
                        theme === 'dark'
                          ? "flex items-center text-xs text-neutral-500 mt-1 w-full"
                          : "flex items-center text-xs text-gray-500 mt-1 w-full",
                        message.sender === 'user' ? 'justify-end pr-12' : 'justify-start pl-11'
                      )}
                    >
                      <span>
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {message.sender === 'bot' && (
                        (!animatedMessageIds.includes(message.id) || completedAnimations.includes(message.id)) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={theme === 'dark'
                              ? "h-4 w-6 p-0 hover:bg-neutral-800 ml-2"
                              : "h-4 w-6 p-0 hover:bg-gray-100 ml-2"}
                            onClick={() => copyToClipboard(message.text)}
                          >
                            <Copy className={theme === 'dark'
                              ? "h-3 w-3 text-neutral-400"
                              : "h-3 w-3 text-gray-500"} />
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex max-w-[80%] flex-row space-x-3">
                      <Avatar className="w-8 h-8 flex-shrink-0 self-start">
                        <AvatarFallback className={theme === 'dark'
                          ? "bg-neutral-800 text-neutral-300"
                          : "bg-gray-200 text-gray-600"}>
                          AI
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center" style={{ minHeight: '2rem', alignItems: 'center', marginTop: '0px' }}>
                        <div className="flex space-x-1">
                          <div className={theme === 'dark'
                            ? "w-2 h-2 bg-neutral-700 rounded-full animate-bounce"
                            : "w-2 h-2 bg-gray-400 rounded-full animate-bounce"}></div>
                          <div className={theme === 'dark'
                            ? "w-2 h-2 bg-neutral-700 rounded-full animate-bounce"
                            : "w-2 h-2 bg-gray-300 rounded-full animate-bounce"} style={{ animationDelay: '0.1s' }}></div>
                          <div className={theme === 'dark'
                            ? "w-2 h-2 bg-neutral-700 rounded-full animate-bounce"
                            : "w-2 h-2 bg-gray-400 rounded-full animate-bounce"} style={{ animationDelay: '0.2s' }}></div>
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

      <ImagePreviewModal
        isOpen={imagePreview.isOpen}
        onClose={() => setImagePreview({ isOpen: false, imageUrl: '' })}
        imageUrl={imagePreview.imageUrl}
      />
    </>
  );
};

export default ChatWindow;
