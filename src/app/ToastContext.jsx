import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(() => {});

/** Transient notifications: showToast(message, type = 'success' | 'error'). */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  }, []);
  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.message}</div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);
