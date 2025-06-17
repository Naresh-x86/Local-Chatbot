import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService, type Chat } from '@/services/api';
import { debugService } from '@/services/debugService';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import ChatContextMenu from '@/components/ChatContextMenu';
import RenameModal from '@/components/RenameModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import { useTheme } from './ChatHeader';

interface ChatSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  selectedChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: (chatId: string) => void;
  onChatDeleted: (chatId: string) => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isCollapsed,
  onToggle,
  selectedChatId,
  onChatSelect,
  onNewChat,
  onChatDeleted
}) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [renameModal, setRenameModal] = useState<{ isOpen: boolean; chat: Chat | null }>({
    isOpen: false,
    chat: null
  });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; chat: Chat | null }>({
    isOpen: false,
    chat: null
  });
  const { user, isDebugMode } = useAuth();
  const { toast } = useToast();
  const { theme } = useTheme();

  useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [user, isDebugMode]);

  const loadChats = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      console.log('Loading chats for user:', user);
      const response = isDebugMode 
        ? await debugService.getChats()
        : await apiService.getChats(user.token);
      
      console.log('Chat response:', response);
      
      // Add safety check for response structure
      if (!response) {
        console.error('No response received from getChats');
        setChats([]);
        return;
      }
      
      if (!response.chats) {
        console.error('Response does not contain chats array:', response);
        setChats([]);
        return;
      }
      
      if (!Array.isArray(response.chats)) {
        console.error('response.chats is not an array:', typeof response.chats, response.chats);
        setChats([]);
        return;
      }
      
      setChats(response.chats);
    } catch (error) {
      console.error('Failed to load chats:', error);
      setChats([]); // Set to empty array on error
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    if (!user) return;

    try {
      const response = isDebugMode
        ? await debugService.createNewChat()
        : await apiService.createNewChat(user.token);
      
      const newChat: Chat = {
        id: response.chat_id,
        created_at: response.created_at,
        title: response.title
      };
      
      setChats(prev => [newChat, ...prev]);
      onChatSelect(newChat.id);
      onNewChat(newChat.id);
      
      if (!isDebugMode) {
        await loadChats();
      }
      
      toast({
        title: "New chat created",
        description: "Start your conversation!",
      });
    } catch (error) {
      console.error('Failed to create new chat:', error);
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive",
      });
    }
  };

  const handleRename = (chat: Chat) => {
    setRenameModal({ isOpen: true, chat });
  };

  const handleDelete = (chat: Chat) => {
    setDeleteModal({ isOpen: true, chat });
  };

  const confirmRename = async (newTitle: string) => {
    if (!user || !renameModal.chat) return;

    try {
      if (isDebugMode) {
        await debugService.renameChat(renameModal.chat.id, newTitle);
      } else {
        await apiService.renameChat(renameModal.chat.id, newTitle, user.token);
      }
      
      setChats(prev => prev.map(chat => 
        chat.id === renameModal.chat!.id 
          ? { ...chat, title: newTitle }
          : chat
      ));
      
      toast({
        title: "Chat renamed",
        description: "The conversation title has been updated",
      });
    } catch (error) {
      console.error('Failed to rename chat:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to rename chat",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!user || !deleteModal.chat) return;

    try {
      if (isDebugMode) {
        await debugService.deleteChat(deleteModal.chat.id);
      } else {
        await apiService.deleteChat(deleteModal.chat.id, user.token);
      }
      
      setChats(prev => prev.filter(chat => chat.id !== deleteModal.chat!.id));
      onChatDeleted(deleteModal.chat.id);
      
      toast({
        title: "Chat deleted",
        description: "The conversation has been removed",
      });
    } catch (error) {
      console.error('Failed to delete chat:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete chat",
        variant: "destructive",
      });
    }
  };

  const groupChatsByTime = (chats: Chat[]) => {
    // Add safety check
    if (!Array.isArray(chats)) {
      console.error('groupChatsByTime received non-array:', chats);
      return {
        today: [],
        lastWeek: [],
        lastMonth: [],
        lastYear: []
      };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const lastYear = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);

    const groups = {
      today: [] as Chat[],
      lastWeek: [] as Chat[],
      lastMonth: [] as Chat[],
      lastYear: [] as Chat[]
    };

    chats.forEach(chat => {
      const chatDate = new Date(chat.created_at);
      if (chatDate >= today) {
        groups.today.push(chat);
      } else if (chatDate >= lastWeek) {
        groups.lastWeek.push(chat);
      } else if (chatDate >= lastMonth) {
        groups.lastMonth.push(chat);
      } else if (chatDate >= lastYear) {
        groups.lastYear.push(chat);
      }
    });

    // Sort each group by created_at descending (latest first)
    Object.keys(groups).forEach(groupKey => {
      groups[groupKey as keyof typeof groups].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    return groups;
  };

  const chatGroups = groupChatsByTime(chats);

  const ChatGroup = ({ title, chats, showSeparator = false }: { title: string; chats: Chat[]; showSeparator?: boolean }) => {
    if (chats.length === 0 || isCollapsed) return null;

    return (
      <div className="mb-4">
        {showSeparator && <Separator className={theme === 'dark' ? "mb-4 bg-neutral-800" : "mb-4 bg-gray-200"} />}
        <h3 className={theme === 'dark'
          ? "text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-3"
          : "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3"}>
          {title}
        </h3>
        <div className="space-y-1">
          {chats.map(chat => (
            <ChatContextMenu
              key={chat.id}
              onRename={() => handleRename(chat)}
              onDelete={() => handleDelete(chat)}
            >
              <button
                onClick={() => onChatSelect(chat.id)}
                className={cn(
                  theme === 'dark'
                    ? "w-full text-left p-3 rounded-lg transition-all duration-200 hover:bg-neutral-800"
                    : "w-full text-left p-3 rounded-lg transition-all duration-200 hover:bg-gray-100",
                  selectedChatId === chat.id &&
                    (theme === 'dark'
                      ? "bg-neutral-900 border-l-4 border-neutral-700 shadow"
                      : "bg-gray-100 border-l-4 border-gray-300 shadow")
                )}
                title={chat.title}
              >
                <div className={theme === 'dark'
                  ? "truncate text-sm font-medium text-neutral-200"
                  : "truncate text-sm font-medium text-gray-800"}>
                  {chat.title}
                </div>
              </button>
            </ChatContextMenu>
          ))}
        </div>
      </div>
    );
  };

  const sidebarShadowOpacity = 0.08; // Adjust this value (0 to 1) for shadow opacity

  return (
    <>
      <div
        className={cn(
          theme === 'dark'
            ? "bg-gradient-to-br from-neutral-900 to-neutral-950 border-r border-neutral-800 flex flex-col transition-all duration-300 ease-in-out"
            : "bg-gradient-to-br from-white to-gray-100 border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out",
          isCollapsed ? "" : "w-80"
        )}
        style={{
          ...(isCollapsed ? { width: 72 } : {}),
          boxShadow: `4px 0 16px 0 rgba(0,0,0,${sidebarShadowOpacity})`,
          zIndex: 2,
          position: 'relative'
        }}
      >
        <div className={theme === 'dark'
          ? "p-4 border-b border-neutral-800 flex items-center justify-between"
          : "p-4 border-b border-gray-200 flex items-center justify-between"}>
          {!isCollapsed && (
            <h1 className={theme === 'dark'
              ? "font-semibold text-neutral-200"
              : "font-semibold text-gray-800"}>Conversations</h1>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={theme === 'dark'
              ? "hover:bg-neutral-800"
              : "hover:bg-gray-100"}
          >
            {isCollapsed
              ? <ChevronRight className={theme === 'dark' ? "h-4 w-4 text-neutral-400" : "h-4 w-4 text-gray-500"} />
              : <ChevronLeft className={theme === 'dark' ? "h-4 w-4 text-neutral-400" : "h-4 w-4 text-gray-500"} />}
          </Button>
        </div>

        <div className="p-4">
          <Button
            onClick={handleNewChat}
            className={cn(
              theme === 'dark'
                ? "bg-neutral-800 hover:bg-neutral-700 transition-all duration-200 shadow"
                : "bg-neutral-700 hover:bg-neutral-600 transition-all duration-200 shadow",
              isCollapsed ? "w-full px-2" : "w-full"
            )}
            size={isCollapsed ? "sm" : "default"}
          >
            <Plus className={theme === 'dark' ? "h-4 w-4 text-neutral-200" : "h-4 w-4 text-gray-100"} />
            {!isCollapsed && <span className={theme === 'dark' ? "ml-2 text-neutral-200" : "ml-2 text-gray-100"}>New Chat</span>}
          </Button>
        </div>

        {!isCollapsed && (
          <ScrollArea className="flex-1">
            <div className="px-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className={theme === 'dark' ? "animate-pulse text-neutral-500" : "animate-pulse text-gray-500"}>Loading...</div>
                </div>
              ) : (
                <>
                  <ChatGroup title="Today" chats={chatGroups.today} />
                  <ChatGroup title="Last Week" chats={chatGroups.lastWeek} showSeparator={chatGroups.today.length > 0} />
                  <ChatGroup title="Last Month" chats={chatGroups.lastMonth} showSeparator={chatGroups.today.length > 0 || chatGroups.lastWeek.length > 0} />
                  <ChatGroup title="Last Year" chats={chatGroups.lastYear} showSeparator={chatGroups.today.length > 0 || chatGroups.lastWeek.length > 0 || chatGroups.lastMonth.length > 0} />
                </>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      <RenameModal
        isOpen={renameModal.isOpen}
        onClose={() => setRenameModal({ isOpen: false, chat: null })}
        onConfirm={confirmRename}
        currentTitle={renameModal.chat?.title || ''}
      />

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, chat: null })}
        onConfirm={() => {
          confirmDelete();
          setDeleteModal({ isOpen: false, chat: null });
        }}
        chatTitle={deleteModal.chat?.title || ''}
      />
    </>
  );
};

export default ChatSidebar;
