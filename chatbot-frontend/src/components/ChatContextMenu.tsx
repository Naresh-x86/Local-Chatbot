
import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Edit, Trash2 } from 'lucide-react';

interface ChatContextMenuProps {
  children: React.ReactNode;
  onRename: () => void;
  onDelete: () => void;
}

const ChatContextMenu: React.FC<ChatContextMenuProps> = ({
  children,
  onRename,
  onDelete
}) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 bg-white border border-gray-200 shadow-lg">
        <ContextMenuItem 
          onClick={onRename}
          className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
        >
          <Edit className="h-4 w-4" />
          <span>Rename</span>
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={onDelete}
          className="flex items-center space-x-2 px-3 py-2 hover:bg-red-50 text-red-600 cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default ChatContextMenu;
