// import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Ganti nilai-nilai di bawah ini dengan konfigurasi dari Firebase Console kamu
const firebaseConfig = {
    apiKey: "AIzaSyAnvNzJ0GyfDkbM58VGADHpkRiN8kV25lI",
    authDomain: "score-board-b6210.firebaseapp.com",
    projectId: "score-board-b6210",
    storageBucket: "score-board-b6210.firebasestorage.app",
    messagingSenderId: "663224219764",
    appId: "1:663224219764:web:a5de3e255bf007c37db921",
    measurementId: "G-CR865LJ1FV"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
// const analytics = getAnalytics(app);