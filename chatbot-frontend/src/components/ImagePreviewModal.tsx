import React from 'react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  alt?: string;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  alt = "Image preview"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="relative">
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 bg-white hover:bg-gray-200 text-black rounded shadow-lg p-2"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <img
          src={imageUrl}
          alt={alt}
          className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-lg"
        />
      </div>
    </div>
  );
};

export default ImagePreviewModal;
