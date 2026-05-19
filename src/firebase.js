import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBryvEP0nPBxINKQ9sam3Hfcu-qXGw_CXw",
  authDomain: "dbd-killer-db.firebaseapp.com",
  projectId: "dbd-killer-db",
  storageBucket: "dbd-killer-db.firebasestorage.app",
  messagingSenderId: "572293650454",
  appId: "1:572293650454:web:eae3adff822f3cdef83d37"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// 認証（Auth）とデータベース（Firestore）のインスタンスを作成してエクスポート
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
