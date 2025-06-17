import React from 'react';
import { File, Image, FileText, Archive } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useTheme } from './ChatHeader';

interface AttachmentIndicatorProps {
  file: {
    filename?: string;
    stored_as?: string;
    content_type?: string;
    size: number;
    name?: string; // For File objects
    type?: string; // For File objects
  };
  isUploading?: boolean;
  uploadProgress?: number;
}

const AttachmentIndicator: React.FC<AttachmentIndicatorProps> = ({ 
  file, 
  isUploading = false, 
  uploadProgress = 0 
}) => {
  const { theme } = useTheme();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (contentType: string, filename: string) => {
    const lowercaseType = contentType.toLowerCase();
    const extension = filename.split('.').pop()?.toLowerCase();

    if (lowercaseType.startsWith('image/')) {
      return <Image className={theme === 'dark' ? "h-4 w-4 text-blue-400" : "h-4 w-4 text-blue-600"} />;
    } else if (lowercaseType === 'application/pdf' || extension === 'pdf') {
      return <FileText className={theme === 'dark' ? "h-4 w-4 text-red-400" : "h-4 w-4 text-red-600"} />;
    } else if (lowercaseType.includes('zip') || lowercaseType.includes('rar') || 
               ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) {
      return <Archive className={theme === 'dark' ? "h-4 w-4 text-purple-400" : "h-4 w-4 text-purple-600"} />;
    } else {
      return <File className={theme === 'dark' ? "h-4 w-4 text-neutral-400" : "h-4 w-4 text-gray-500"} />;
    }
  };

  const filename = file.filename || file.name || 'Unknown file';
  const contentType = file.content_type || file.type || 'application/octet-stream';

  return (
    <div className={theme === 'dark'
      ? "inline-flex flex-col space-y-2 bg-neutral-900 rounded-lg px-3 py-2 mb-2 max-w-xs"
      : "inline-flex flex-col space-y-2 bg-gray-100 rounded-lg px-3 py-2 mb-2 max-w-xs"}>
      <div className="flex items-center space-x-2">
        {getFileIcon(contentType, filename)}
        <div className="flex flex-col">
          <span className={theme === 'dark'
            ? "text-xs font-medium text-neutral-100 truncate max-w-32"
            : "text-xs font-medium text-gray-700 truncate max-w-32"}>
            {filename}
          </span>
          <span className={theme === 'dark'
            ? "text-xs text-neutral-400"
            : "text-xs text-gray-500"}>
            {formatFileSize(file.size)}
          </span>
        </div>
      </div>
      
      {isUploading && (
        <div className="w-full">
          <Progress
            value={uploadProgress}
            className={
              theme === 'dark'
                ? "w-full h-2 bg-neutral-800 [&>div]:bg-blue-400"
                : "w-full h-2 bg-gray-200 [&>div]:bg-blue-600"
            }
          />
          <span className={theme === 'dark'
            ? "text-xs text-neutral-400 mt-1"
            : "text-xs text-gray-500 mt-1"}>Uploading and inferring...</span>
        </div>
      )}
    </div>
  );
};

export default AttachmentIndicator;
