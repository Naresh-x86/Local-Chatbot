
interface Chat {
  id: string;
  created_at: string;
  title: string;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  image?: string | null;
  timestamp: string;
  file?: {
    filename: string;
    stored_as: string;
    content_type: string;
    size: number;
  };
}

interface Model {
  id: string;
  name: string;
}

const mockChats: Chat[] = [
  { id: '1', created_at: new Date().toISOString(), title: 'Today\'s Conversation' },
  { id: '2', created_at: new Date(Date.now() - 86400000).toISOString(), title: 'Yesterday Chat' },
  { id: '3', created_at: new Date(Date.now() - 7 * 86400000).toISOString(), title: 'Last Week Discussion' },
  { id: '4', created_at: new Date(Date.now() - 30 * 86400000).toISOString(), title: 'Monthly Review' }
];

const mockModels: Model[] = [
  { id: 'Meta-Llama-3-8B.Q4_K_M.gguf', name: 'Llama 3 8B' },
  { id: 'Mistral-7B-Instruct-v0.2.Q4_K_M.gguf', name: 'Mistral 7B' },
  { id: 'GPT-4-Turbo.gguf', name: 'GPT-4 Turbo' }
];

const mockBotResponses = [
  "That's an interesting question! Let me think about that.",
  "I can help you with that. Here's what I know...",
  "Great point! I'd love to explore this further.",
  "Let me process that information for you.",
  "That's a complex topic. Here's my perspective...",
  "I understand what you're asking. Let me explain...",
  "That's a good question! Here's what I can tell you..."
];

const mockImages = [
  'https://picsum.photos/seed/1/1280/720',
  'https://picsum.photos/seed/2/1280/720',
  'https://picsum.photos/seed/3/1280/720',
  'https://picsum.photos/seed/4/1280/720',
  'https://picsum.photos/seed/5/1280/720'
];

export class DebugService {
  private messages: Map<string, Message[]> = new Map();
  private chats: Chat[] = [...mockChats];

  constructor() {
    // Initialize with some mock messages
    this.messages.set('1', [
      {
        id: '1',
        sender: 'user',
        text: 'Hello! How are you today?',
        timestamp: new Date().toISOString()
      },
      {
        id: '2',
        sender: 'bot',
        text: 'Hello! I\'m doing great, thank you for asking. How can I help you today?',
        image: Math.random() > 0.5 ? mockImages[0] : undefined,
        timestamp: new Date().toISOString()
      }
    ]);
  }

  async getChats(): Promise<{ chats: Chat[] }> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ chats: this.chats });
      }, 500);
    });
  }

  async createNewChat(): Promise<{ chat_id: string; created_at: string; title: string }> {
    return new Promise(resolve => {
      setTimeout(() => {
        const newChat = {
          chat_id: `debug_${Date.now()}`,
          created_at: new Date().toISOString(),
          title: 'New Debug Chat'
        };
        this.chats.unshift({
          id: newChat.chat_id,
          created_at: newChat.created_at,
          title: newChat.title
        });
        resolve(newChat);
      }, 300);
    });
  }

  async getChatMessages(chatId: string): Promise<{ messages: Message[] }> {
    return new Promise(resolve => {
      setTimeout(() => {
        const messages = this.messages.get(chatId) || [];
        resolve({ messages });
      }, 200);
    });
  }

  async sendMessage(
    chatId: string, 
    text: string, 
    file?: File, 
    onUploadProgress?: (progress: number) => void
  ): Promise<Message> {
    return new Promise(resolve => {
      // Add user message
      const userMessage: Message = {
        id: `user_${Date.now()}`,
        sender: 'user',
        text,
        timestamp: new Date().toISOString(),
        ...(file && {
          file: {
            filename: file.name,
            stored_as: `${Date.now()}_${file.name}`,
            content_type: file.type,
            size: file.size
          }
        })
      };

      const existingMessages = this.messages.get(chatId) || [];
      this.messages.set(chatId, [...existingMessages, userMessage]);

      // Simulate file upload progress if file exists
      if (file && onUploadProgress) {
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += Math.random() * 20;
          if (progress >= 100) {
            progress = 100;
            clearInterval(progressInterval);
            onUploadProgress(progress);
            
            // After upload completes, simulate bot response delay
            setTimeout(() => {
              const botResponse: Message = {
                id: `bot_${Date.now()}`,
                sender: 'bot',
                text: mockBotResponses[Math.floor(Math.random() * mockBotResponses.length)],
                image: Math.random() > 0.7 ? mockImages[Math.floor(Math.random() * mockImages.length)] : undefined,
                timestamp: new Date().toISOString()
              };

              const currentMessages = this.messages.get(chatId) || [];
              this.messages.set(chatId, [...currentMessages, botResponse]);
              
              resolve(botResponse);
            }, 500);
          } else {
            onUploadProgress(progress);
          }
        }, 100);
      } else {
        // No file, immediate bot response
        setTimeout(() => {
          const botResponse: Message = {
            id: `bot_${Date.now()}`,
            sender: 'bot',
            text: mockBotResponses[Math.floor(Math.random() * mockBotResponses.length)],
            image: Math.random() > 0.7 ? mockImages[Math.floor(Math.random() * mockImages.length)] : undefined,
            timestamp: new Date().toISOString()
          };

          const currentMessages = this.messages.get(chatId) || [];
          this.messages.set(chatId, [...currentMessages, botResponse]);
          
          resolve(botResponse);
        }, 1000 + Math.random() * 1500);
      }
    });
  }

  async renameChat(chatId: string, title: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const chatIndex = this.chats.findIndex(chat => chat.id === chatId);
        if (chatIndex === -1) {
          reject(new Error('Chat not found'));
          return;
        }
        this.chats[chatIndex].title = title;
        resolve();
      }, 300);
    });
  }

  async deleteChat(chatId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const chatIndex = this.chats.findIndex(chat => chat.id === chatId);
        if (chatIndex === -1) {
          reject(new Error('Chat not found'));
          return;
        }
        this.chats.splice(chatIndex, 1);
        this.messages.delete(chatId);
        resolve();
      }, 300);
    });
  }

  async getModels(): Promise<Model[]> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(mockModels);
      }, 200);
    });
  }
}

export const debugService = new DebugService();
