import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import ChatHeader from '@/components/ChatHeader';
import ChatSidebar from '@/components/ChatSidebar';
import ChatWindow from '@/components/ChatWindow';
import MessageInput from '@/components/MessageInput';
import ToolBar from '@/components/ToolBar';

const Chat = () => {
  const { user, isDebugMode } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [isToolBarOpen, setIsToolBarOpen] = useState(false);

  console.log('Chat component rendered with user:', user);
  console.log('Debug mode:', isDebugMode);

  if (!user) {
    console.log('No user found, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  if (!user.username || !user.token) {
    console.error('User object is missing required fields:', user);
    return <Navigate to="/auth" replace />;
  }

  const handleSendMessage = (message: string, file?: File) => {
    console.log('Sending message:', message, file);
    setNewMessage(message);
    setNewFile(file || null);
  };

  const handleMessageSent = () => {
    setNewMessage(null);
    setNewFile(null);
  };

  const handleNewChat = (chatId: string) => {
    console.log('New chat created:', chatId);
    setSelectedChatId(chatId);
  };

  const handleChatDeleted = (deletedChatId: string) => {
    console.log('Chat deleted:', deletedChatId);
    if (selectedChatId === deletedChatId) {
      setSelectedChatId(null);
    }
  };

  try {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <ChatHeader selectedModel={selectedModel} onModelChange={setSelectedModel} />
        
        <div className="flex flex-1 overflow-hidden">
          <ChatSidebar
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            selectedChatId={selectedChatId}
            onChatSelect={setSelectedChatId}
            onNewChat={handleNewChat}
            onChatDeleted={handleChatDeleted}
          />
          
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <ChatWindow
              selectedChatId={selectedChatId}
              newMessage={newMessage}
              newFile={newFile}
              onMessageSent={handleMessageSent}
              isTyping={isTyping}
              setIsTyping={setIsTyping}
              selectedModel={selectedModel}
            />
            
            <MessageInput
              onSendMessage={handleSendMessage}
              disabled={!selectedChatId || isTyping || !selectedModel}
              isTyping={isTyping}
            />
          </div>

          {/* Toolbar toggle and panel */}
          <div className="relative h-full">
            <ToolBar
              isOpen={isToolBarOpen}
              onToggle={() => setIsToolBarOpen((v) => !v)}
              visible={!!selectedChatId}
            />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error rendering Chat component:', error);
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">Please try refreshing the page or logging in again.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
};

export default Chat;
