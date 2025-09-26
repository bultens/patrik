// KLISTRA IN DIN FIREBASE CONFIG FRÅN GOOGLE HÄR
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAJXkko21L1cFYa7ZIQFNCjFeimh0hR6tA",
  authDomain: "godplayer-796e0.firebaseapp.com",
  projectId: "godplayer-796e0",
  storageBucket: "godplayer-796e0.firebasestorage.app",
  messagingSenderId: "946263139037",
  appId: "1:946263139037:web:c0059e9cd5cbc90d1db134",
  measurementId: "G-5Z6QY1E5EY"
};

// Importera funktioner från Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Initiera Firebase
const app = initializeApp(firebaseConfig);

// Exportera de tjänster vi kommer att använda i andra filer
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);