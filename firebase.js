import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

// 🔥 REPLACE THIS WITH YOUR FIREBASE CONFIG FROM STEP 3
const firebaseConfig = {
  apiKey: "AIzaSyA43BoXl1L3NkqwrPUVvBWiIQzoN7Mpd7Q",
  authDomain: "cloud-backup-system-90862.firebaseapp.com",
  projectId: "cloud-backup-system-90862",
  storageBucket: "cloud-backup-system-90862.firebasestorage.app",
  messagingSenderId: "852979702673",
  appId: "1:852979702673:web:99095236e1f9f8f2e39830"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore(app);

export default app;