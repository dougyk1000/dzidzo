import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, XCircle, Info, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
}

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  hideNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const hideNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback(({ type, title, message, duration = 5000 }: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, type, title, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        hideNotification(id);
      }, duration);
    }
  }, [hideNotification]);

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className="pointer-events-auto"
            >
              <div className={`
                relative overflow-hidden p-4 rounded-2xl shadow-2xl border flex gap-4 
                ${notification.type === 'error' ? 'bg-rose-50 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/50' : ''}
                ${notification.type === 'success' ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/50' : ''}
                ${notification.type === 'warning' ? 'bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/50' : ''}
                ${notification.type === 'info' ? 'bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/50' : ''}
              `}>
                <div className={`
                  shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                  ${notification.type === 'error' ? 'bg-rose-500 text-white' : ''}
                  ${notification.type === 'success' ? 'bg-emerald-500 text-white' : ''}
                  ${notification.type === 'warning' ? 'bg-amber-500 text-white' : ''}
                  ${notification.type === 'info' ? 'bg-blue-500 text-white' : ''}
                `}>
                  {notification.type === 'error' && <XCircle size={20} />}
                  {notification.type === 'success' && <CheckCircle2 size={20} />}
                  {notification.type === 'warning' && <AlertCircle size={20} />}
                  {notification.type === 'info' && <Info size={20} />}
                </div>

                <div className="flex-1 min-w-0">
                  {notification.title && (
                    <h3 className={`text-sm font-black mb-0.5 leading-none
                      ${notification.type === 'error' ? 'text-rose-900 dark:text-rose-200' : ''}
                      ${notification.type === 'success' ? 'text-emerald-900 dark:text-emerald-200' : ''}
                      ${notification.type === 'warning' ? 'text-amber-900 dark:text-amber-200' : ''}
                      ${notification.type === 'info' ? 'text-blue-900 dark:text-blue-200' : ''}
                    `}>
                      {notification.title}
                    </h3>
                  )}
                  <p className={`text-sm leading-relaxed
                    ${notification.type === 'error' ? 'text-rose-700/80 dark:text-rose-300' : ''}
                    ${notification.type === 'success' ? 'text-emerald-700/80 dark:text-emerald-300' : ''}
                    ${notification.type === 'warning' ? 'text-amber-700/80 dark:text-amber-300' : ''}
                    ${notification.type === 'info' ? 'text-blue-700/80 dark:text-blue-300' : ''}
                  `}>
                    {notification.message}
                  </p>
                </div>

                <button 
                  onClick={() => hideNotification(notification.id)}
                  className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 self-start"
                >
                  <X size={16} />
                </button>

                {/* Progress Bar */}
                {notification.duration && notification.duration > 0 && (
                  <motion.div 
                    initial={{ scaleX: 1 }}
                    animate={{ scaleX: 0 }}
                    transition={{ duration: notification.duration / 1000, ease: 'linear' }}
                    className={`absolute bottom-0 left-0 h-1 w-full origin-left
                      ${notification.type === 'error' ? 'bg-rose-500/30' : ''}
                      ${notification.type === 'success' ? 'bg-emerald-500/30' : ''}
                      ${notification.type === 'warning' ? 'bg-amber-500/30' : ''}
                      ${notification.type === 'info' ? 'bg-blue-500/30' : ''}
                    `}
                  />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
