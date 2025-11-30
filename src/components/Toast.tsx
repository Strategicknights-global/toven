import React from 'react';
import { createPortal } from 'react-dom';
import { useToastStore } from '../stores/toastStore';

const Toast: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 space-y-2 z-[1300]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto max-w-sm p-4 rounded-md shadow-lg border-l-4 transform transition-all duration-300 ease-in-out ${
            toast.type === 'success'
              ? 'bg-green-100 border-green-500 text-green-700'
              : toast.type === 'error'
              ? 'bg-red-100 border-red-500 text-red-700'
              : toast.type === 'info'
              ? 'bg-blue-100 border-blue-500 text-blue-700'
              : 'bg-yellow-100 border-yellow-500 text-yellow-700'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-sm">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-4 text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>,
    document.body
  );
};

export default Toast;
