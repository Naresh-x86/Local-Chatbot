import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import NET from 'vanta/dist/vanta.net.min';
import * as THREE from 'three';

const Auth = () => {
  const [username, setUsername] = useState(''); // Fixed variable names
  const [password, setPassword] = useState(''); // Fixed variable names
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [vantaEffect, setVantaEffect] = useState<any>(null);
  const vantaRef = useRef(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, setDebugMode } = useAuth();

  useEffect(() => {
    if (!vantaEffect) {
      setVantaEffect(
        NET({
          el: vantaRef.current,
          THREE: THREE,
          mouseControls: false,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          color: 0x1a1a1a, // White nets
          backgroundColor: 0x000000, // Pure black background
          points: 11.00,
          maxDistance: 25.00,
          spacing: 18.00,
          showDots: true,
          opacity: 0.15 // Subtle net opacity
        })
      );
    }
    return () => {
      if (vantaEffect) vantaEffect.destroy();
    };
  }, [vantaEffect]);

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
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-[#0A0A0A]">
      {/* Vanta.js background */}
      <div ref={vantaRef} className="absolute inset-0 opacity-90" />
      
      {/* Login card */}
      <Card className="w-full max-w-md shadow-2xl backdrop-blur-sm bg-[#141414]/10 border border-[#2A2A2A] relative z-10">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold text-white/90">
            ChatBot App
          </CardTitle>
          <p className="text-[#A0A0A0]">Sign in to your account</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[#E0E0E0]">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="transition-all duration-200 focus:ring-2 focus:ring-white/20 bg-[#1A1A1A]/80 border-[#2A2A2A] text-white/80 placeholder:text-[#505050]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#E0E0E0]">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="transition-all duration-200 focus:ring-2 focus:ring-white/20 bg-[#1A1A1A]/80 border-[#2A2A2A] text-white/80 placeholder:text-[#505050]"
              />
            </div>

            {error && (
              <div className="text-[#FF4444] text-sm bg-[#FF0000]/10 backdrop-blur-sm p-3 rounded-md border border-[#FF0000]/20">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-white/10 hover:bg-white/15 text-white/90 transition-all duration-200 transform hover:scale-[1.02] shadow-lg border border-white/10"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Login'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#2A2A2A]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#141414] px-2 text-[#505050]">Or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full border border-[#2A2A2A] hover:bg-white/5 hover:text-white/70 text-black/70 transition-all duration-200 transform hover:scale-[1.02] backdrop-blur-sm"
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
