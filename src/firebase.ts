import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Use initializeFirestore with experimentalForceLongPolling: true to bypass 
// persistent connection issues in sandboxed or proxied environments.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
}, (firebaseConfig as any).firestoreDatabaseId);

export const auth = getAuth(app);
