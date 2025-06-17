
interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  username: string;
  token: string;
  profile_pic?: string;
}

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

interface ChatListResponse {
  chats: Chat[];
}

interface MessagesResponse {
  messages: Message[];
}

interface NewChatResponse {
  chat_id: string;
  created_at: string;
  title: string;
}

interface Model {
  id: string;
  name: string;
}

const API_BASE_URL = 'http://localhost:8000';

class ApiService {
  private getAuthHeaders(token?: string) {
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    return response.json();
  }

  async getChats(token: string): Promise<ChatListResponse> {
    const response = await fetch(`${API_BASE_URL}/chat/chats`, {
      method: 'GET',
      headers: this.getAuthHeaders(token)
    });

    if (!response.ok) {
      throw new Error('Failed to fetch chats');
    }

    return response.json();
  }

  async createNewChat(token: string): Promise<NewChatResponse> {
    const response = await fetch(`${API_BASE_URL}/chat/chat/new`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw new Error('Failed to create new chat');
    }

    return response.json();
  }

  async getChatMessages(chatId: string, token: string): Promise<MessagesResponse> {
    const response = await fetch(`${API_BASE_URL}/chat/chat/${chatId}/messages`, {
      method: 'GET',
      headers: this.getAuthHeaders(token)
    });

    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }

    return response.json();
  }

  async sendMessage(
    chatId: string, 
    text: string, 
    token: string, 
    file?: File, 
    modelId?: string,
    onUploadProgress?: (progress: number) => void
  ): Promise<Message> {
    // Always use FormData for multipart/form-data
    const formData = new FormData();
    formData.append('text', text);
    if (modelId) {
      formData.append('model_id', modelId);
    }
    if (file) {
      formData.append('file', file);
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      if (onUploadProgress && file) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onUploadProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          reject(new Error('Failed to send message'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error'));
      });

      xhr.open('POST', `${API_BASE_URL}/chat/chat/${chatId}/send`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  }

  async renameChat(chatId: string, title: string, token: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/chat/chat/${chatId}/rename`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ title })
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Chat not found');
      }
      throw new Error('Failed to rename chat');
    }
  }

  async deleteChat(chatId: string, token: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/chat/chat/${chatId}/delete`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(token)
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Chat not found');
      }
      throw new Error('Failed to delete chat');
    }
  }

  async getModels(token: string): Promise<Model[]> {
    const response = await fetch(`${API_BASE_URL}/chat/models`, {
      method: 'GET',
      headers: this.getAuthHeaders(token)
    });

    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }

    return response.json();
  }
}

export const apiService = new ApiService();
export type { Chat, Message, LoginRequest, LoginResponse, Model };
