import { useCallback } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { getFriendlyFirestoreError, handleFirestoreError, OperationType } from '../utils/firestore-errors';

export function useErrorHandler() {
  const { showNotification } = useNotification();

  const handleError = useCallback((error: unknown, operationType: OperationType, path: string | null) => {
    // Log the technical error for debugging
    handleFirestoreError(error, operationType, path);

    // Show friendly message to user
    const { title, message } = getFriendlyFirestoreError(error);
    showNotification({
      type: 'error',
      title,
      message,
    });
  }, [showNotification]);

  const handleGeminiError = useCallback((error: unknown) => {
    console.error('Gemini API Error:', error);
    showNotification({
      type: 'error',
      title: 'Tutor Unavailable',
      message: 'Dzidzo is taking a quick break. Please try sending your message again in a moment.',
    });
  }, [showNotification]);

  const showSuccess = useCallback((message: string, title: string = 'Success') => {
    showNotification({
      type: 'success',
      title,
      message,
    });
  }, [showNotification]);

  return { handleError, handleGeminiError, showSuccess };
}
