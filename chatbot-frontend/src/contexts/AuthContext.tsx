
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  username: string;
  token: string;
  profile_pic?: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isDebugMode: boolean;
  setDebugMode: (debug: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('chatbot_user');
      const savedDebugMode = localStorage.getItem('chatbot_debug_mode');
      
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        console.log('Loaded user from localStorage:', parsedUser);
        
        // Validate user object
        if (parsedUser && typeof parsedUser === 'object' && parsedUser.username && parsedUser.token) {
          setUser(parsedUser);
        } else {
          console.warn('Invalid user data in localStorage, clearing...');
          localStorage.removeItem('chatbot_user');
        }
      }
      
      if (savedDebugMode) {
        setIsDebugMode(JSON.parse(savedDebugMode));
      }
    } catch (error) {
      console.error('Error loading auth data from localStorage:', error);
      localStorage.removeItem('chatbot_user');
      localStorage.removeItem('chatbot_debug_mode');
    }
  }, []);

  const login = (userData: User) => {
    console.log('Logging in user:', userData);
    
    // Validate user data
    if (!userData || !userData.username || !userData.token) {
      console.error('Invalid user data provided to login:', userData);
      throw new Error('Invalid user data');
    }
    
    const validatedUser: User = {
      username: userData.username,
      token: userData.token,
      profile_pic: userData.profile_pic
    };
    
    setUser(validatedUser);
    localStorage.setItem('chatbot_user', JSON.stringify(validatedUser));
    console.log('User login successful');
  };

  const logout = () => {
    console.log('Logging out user');
    setUser(null);
    setIsDebugMode(false);
    localStorage.removeItem('chatbot_user');
    localStorage.removeItem('chatbot_debug_mode');
  };

  const setDebugModeState = (debug: boolean) => {
    console.log('Setting debug mode:', debug);
    setIsDebugMode(debug);
    localStorage.setItem('chatbot_debug_mode', JSON.stringify(debug));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isDebugMode, setDebugMode: setDebugModeState }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
