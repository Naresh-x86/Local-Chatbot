import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { debugService } from '@/services/debugService';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from './ChatHeader';

interface Model {
  id: string;
  name: string;
}

interface ModelSelectorProps {
  selectedModel: string | null;
  onModelChange: (modelId: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelChange }) => {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user, isDebugMode } = useAuth();
  const { toast } = useToast();
  const { theme } = useTheme();

  useEffect(() => {
    if (user) {
      loadModels();
    }
  }, [user, isDebugMode]);

  const loadModels = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      console.log('Loading models...');
      const response = isDebugMode
        ? await debugService.getModels()
        : await apiService.getModels(user.token);
      
      console.log('Models response:', response);
      
      // Add safety check for response
      if (!response) {
        console.error('No response received from getModels');
        setModels([]);
        return;
      }
      
      if (!Array.isArray(response)) {
        console.error('Models response is not an array:', typeof response, response);
        setModels([]);
        return;
      }
      
      setModels(response);
    } catch (error) {
      console.error('Failed to load models:', error);
      setModels([]); // Set to empty array on error
      toast({
        title: "Error",
        description: "Failed to load available models",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedModelName = models.find(model => model.id === selectedModel)?.name || 'Select Model';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={
            (theme === 'dark'
              ? "min-w-[400px] justify-between bg-neutral-900 border-neutral-800 text-neutral-100 hover:bg-neutral-800 hover:text-blue-300"
              : "min-w-[400px] justify-between bg-white border-gray-200 text-gray-900 hover:bg-gray-100")
          }
          disabled={isLoading}
        >
          <span className="truncate">
            {isLoading ? 'Loading models...' : selectedModelName}
          </span>
          <ChevronDown className={theme === 'dark' ? "h-4 w-4 text-neutral-400" : "h-4 w-4 text-gray-500"} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className={theme === 'dark'
        ? "min-w-[400px] bg-neutral-900 border border-neutral-800 text-neutral-100"
        : "min-w-[400px] bg-white border border-gray-200 text-gray-900"}>
        {models.length === 0 ? (
          <DropdownMenuItem disabled className={theme === 'dark' ? "text-neutral-500" : "text-gray-500"}>
            {isLoading ? 'Loading...' : 'No models available'}
          </DropdownMenuItem>
        ) : (
          models.map((model) => (
            <DropdownMenuItem
              key={model.id}
              onClick={() => onModelChange(model.id)}
              className={
                selectedModel === model.id
                  ? (theme === 'dark'
                      ? 'bg-neutral-800 text-blue-400'
                      : 'bg-blue-50 text-blue-700')
                  : (theme === 'dark'
                      ? 'hover:bg-neutral-800'
                      : 'hover:bg-gray-100')
              }
            >
              {model.name}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ModelSelector;
