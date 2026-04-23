import { auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export function getFriendlyFirestoreError(error: unknown): { title: string; message: string } {
  const message = error instanceof Error ? error.message : String(error);
  
  if (message.includes('permission-denied') || message.includes('insufficient permissions')) {
    return {
      title: 'Access Denied',
      message: 'You don\'t have permission to perform this action. If you believe this is an error, please contact your school administrator.'
    };
  }
  
  if (message.includes('unavailable') || message.includes('offline')) {
    return {
      title: 'Connection Lost',
      message: 'Dzidzo is having trouble reaching the school server. Please check your internet connection.'
    };
  }
  
  if (message.includes('deadline-exceeded')) {
    return {
      title: 'Request Timed Out',
      message: 'The operation took too long. Please try again when you have a faster connection.'
    };
  }

  if (message.includes('quota-exceeded')) {
    return {
      title: 'System Capacity Reached',
      message: 'The school portal has reached its daily data limit. Please try again tomorrow.'
    };
  }
  
  return {
    title: 'Database Error',
    message: 'An unexpected error occurred while saving your data. Please try again later.'
  };
}
