import React, { useState, useEffect, useContext, createContext } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, ChevronDown, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import ModelSelector from '@/components/ModelSelector';
import ThemeSwitchOverlay from './ThemeSwitchOverlay';

interface ChatHeaderProps {
  selectedModel: string | null;
  onModelChange: (modelId: string) => void;
}

// Theme context for toggling dark/light
type Theme = 'dark' | 'light';
const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({
  theme: 'dark',
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'dark';
    }
    return 'dark';
  });
  const [showOverlay, setShowOverlay] = useState(false);
  const [pendingTheme, setPendingTheme] = useState<Theme>(theme);

  // Actually apply the theme to <html>
  useEffect(() => {
    document.documentElement.classList.remove('theme-dark', 'theme-light');
    document.documentElement.classList.add(`theme-${theme}`);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // The new toggleTheme function
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setPendingTheme(nextTheme);
    setShowOverlay(true);

    setTimeout(() => {
      setTheme(nextTheme);
      // Wait a bit before hiding overlay so the user sees the new theme
      setTimeout(() => setShowOverlay(false), 500);
    }, 350); // Fade in overlay before switching theme
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <ThemeSwitchOverlay show={showOverlay} theme={pendingTheme} />
      {children}
    </ThemeContext.Provider>
  );
};

const ChatHeader: React.FC<ChatHeaderProps> = ({ selectedModel, onModelChange }) => {
  const { user, logout, isDebugMode } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
    navigate('/auth');
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
  };

  if (!user) return null;

  return (
    <header
      className={
        theme === 'dark'
          ? "bg-gradient-to-br from-neutral-900 to-neutral-950 border-b border-neutral-800 px-6 py-4 flex items-center justify-between shadow-md"
          : "bg-gradient-to-br from-white to-gray-100 border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-md"
      }
      style={{
        boxShadow: '0 4px 16px 0 rgba(0,0,0,0.08)',
        zIndex: 10
      }}
    >
      <div className="flex items-center space-x-3">
        <div className={theme === 'dark'
          ? "w-8 h-8 bg-neutral-800 rounded-lg flex items-center justify-center shadow"
          : "w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center shadow"}>
          <span className={theme === 'dark' ? "text-neutral-200 font-bold text-sm" : "text-gray-800 font-bold text-sm"}>CB</span>
        </div>
        <div>
          <h1 className={theme === 'dark' ? "text-xl font-bold text-neutral-100" : "text-xl font-bold text-gray-900"}>ChatBot App</h1>
          {isDebugMode && (
            <span className={theme === 'dark'
              ? "text-xs bg-neutral-800 text-neutral-400 px-2 py-1 rounded-full"
              : "text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full"}>
              Debug Mode
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 flex justify-center">
        <ModelSelector selectedModel={selectedModel} onModelChange={onModelChange} />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={theme === 'dark'
            ? "flex items-center space-x-2 hover:bg-neutral-800 transition-colors"
            : "flex items-center space-x-2 hover:bg-gray-100 transition-colors"}>
            <Avatar className="w-8 h-8">
              <AvatarImage src={user.profile_pic} alt={user.username} />
              <AvatarFallback className={theme === 'dark'
                ? "bg-neutral-700 text-neutral-200"
                : "bg-gray-300 text-gray-800"}>
                {user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className={theme === 'dark' ? "font-medium text-neutral-200" : "font-medium text-gray-800"}>{user.username}</span>
            <ChevronDown className={theme === 'dark' ? "h-4 w-4 text-neutral-400" : "h-4 w-4 text-gray-500"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={theme === 'dark'
          ? "w-48 bg-neutral-900 border border-neutral-800 shadow-lg"
          : "w-48 bg-white border border-gray-200 shadow-lg"}>
          <DropdownMenuItem
            onClick={toggleTheme}
            className={theme === 'dark'
              ? "flex items-center space-x-2 cursor-pointer hover:bg-neutral-800 group"
              : "flex items-center space-x-2 cursor-pointer hover:bg-gray-100 group"}
          >
            {theme === 'dark'
              ? <Sun className="h-4 w-4 text-yellow-400" />
              : <Moon className="h-4 w-4 text-gray-600" />}
            <span className={theme === 'dark' ? "text-neutral-200 group-hover:text-neutral-800" : "text-gray-800 group-hover:text-neutral-800"}>
              {theme === 'dark' ? 'Light theme' : 'Dark theme'}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={handleLogout}
            className={theme === 'dark'
              ? "flex items-center space-x-2 text-red-400 hover:bg-neutral-800 cursor-pointer"
              : "flex items-center space-x-2 text-red-600 hover:bg-gray-100 cursor-pointer"}
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default ChatHeader;
