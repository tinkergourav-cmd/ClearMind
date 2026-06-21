// =============================================================================
// Firebase Configuration
// =============================================================================
// HOW TO SET UP:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project (or use an existing one)
// 3. Click "Add app" and choose the Web platform (</>)
// 4. Register your app and copy the config values below
// 5. In the Firebase console, go to "Firestore Database" and create a database
// 6. Replace the placeholder values below with your actual Firebase config
// =============================================================================

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBlMMgjw31XpBYbEZcq-mNRC75tHtybYW8",
  authDomain: "clear-mind-7d853.firebaseapp.com",
  projectId: "clear-mind-7d853",
  storageBucket: "clear-mind-7d853.firebasestorage.app",
  messagingSenderId: "311536235445",
  appId: "1:311536235445:web:9f0ed081d86ef4dd185ffc",
  measurementId: "G-EDGW6BGEXD"
};

// Check if Firebase is configured (not using placeholder values)
export const isFirebaseConfigured = () => {
  return (
    firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" &&
    firebaseConfig.projectId !== "YOUR_PROJECT_ID_HERE" &&
    firebaseConfig.appId !== "YOUR_APP_ID_HERE"
  );
};

// Initialize Firebase only if configured
let app = null;
let db = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (error) {
    console.warn('[Firebase] Failed to initialize:', error.message);
  }
}

export { db };
export default app;
