import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAd5ezb6CHDXcmZVrpoTUbbJyxdnLaM9Jw",
  authDomain: "floodmap-4f332.firebaseapp.com",
  databaseURL: "https://floodmap-4f332-default-rtdb.firebaseio.com",
  projectId: "floodmap-4f332",
  storageBucket: "floodmap-4f332.firebasestorage.app",
  messagingSenderId: "1084370440686",
  appId: "1:1084370440686:web:f7cb89d3cea6674284beff",
  measurementId: "G-C01XXM1E9N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// OpenWeatherMap API configuration
export const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
export const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';