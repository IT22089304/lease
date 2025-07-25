import { initializeApp, getApps } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getAnalytics, isSupported } from "firebase/analytics"

const firebaseConfig = {
  apiKey: "AIzaSyAKxSdcmSkHa_bbLcOjWUCPdjIHUGlypy8",
  authDomain: "propertymanager-7736f.firebaseapp.com",
  projectId: "propertymanager-7736f",
  storageBucket: "propertymanager-7736f.firebasestorage.app",
  messagingSenderId: "813112106486",
  appId: "1:813112106486:web:48b4fde2dc85eb838ffbd7",
  measurementId: "G-GGKZ1R2E9D"
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

// Initialize Analytics and catch if not supported (e.g. in SSR/Node)
let analytics = null
if (typeof window !== 'undefined') {
  isSupported().then(yes => yes && (analytics = getAnalytics(app)))
}

export { app, auth, db, storage, analytics } 