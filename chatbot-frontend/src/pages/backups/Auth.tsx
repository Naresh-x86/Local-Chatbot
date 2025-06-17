
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';

const Auth = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, setDebugMode } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('Attempting login with:', { username, password });
      const response = await apiService.login({ username, password });
      console.log('Login response:', response);
      
      // Ensure the response has all required fields
      if (!response.username || !response.token) {
        throw new Error('Invalid response from server');
      }
      
      const userData = {
        username: response.username,
        token: response.token,
        profile_pic: response.profile_pic || undefined
      };
      
      console.log('Setting user data:', userData);
      login(userData);
      setDebugMode(false);
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${response.username}!`,
      });
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed');
      toast({
        title: "Login failed",
        description: err.message || 'Invalid credentials',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDebugMode = () => {
    const debugUser = {
      username: 'Debug User',
      token: 'debug_token_123',
      profile_pic: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
    };
    
    login(debugUser);
    setDebugMode(true);
    toast({
      title: "Debug mode activated",
      description: "You're now in debug mode - all data is simulated",
    });
    navigate('/');
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Background with gradient and abstract shapes */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100">
        {/* Abstract geometric shapes */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-blue-200/30 rounded-full blur-xl"></div>
        <div className="absolute top-1/4 right-20 w-48 h-48 bg-purple-200/40 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-indigo-200/35 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-24 h-24 bg-blue-300/25 rounded-full blur-lg"></div>
        
        {/* Floating abstract elements */}
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 w-2 h-20 bg-gradient-to-b from-blue-300/20 to-transparent rotate-45"></div>
        <div className="absolute bottom-1/3 right-1/3 w-2 h-16 bg-gradient-to-b from-purple-300/20 to-transparent rotate-12"></div>
        <div className="absolute top-1/2 left-1/6 w-1 h-12 bg-gradient-to-b from-indigo-300/25 to-transparent -rotate-30"></div>
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        ></div>
      </div>
      
      {/* Login card */}
      <Card className="w-full max-w-md shadow-2xl backdrop-blur-sm bg-white/95 border border-white/20 relative z-10">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ChatBot App
          </CardTitle>
          <p className="text-gray-600">Sign in to your account</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 bg-white/80 backdrop-blur-sm"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50/80 backdrop-blur-sm p-3 rounded-md border border-red-200">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Login'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/90 px-2 text-gray-500">Or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full border-2 hover:bg-gray-50/80 transition-all duration-200 transform hover:scale-[1.02] backdrop-blur-sm bg-white/60"
            onClick={handleDebugMode}
          >
            Debug Mode
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
