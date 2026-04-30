import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyClxDUQsBAUCOHuV1iTCqFmUYeyJeGC2rk",
  authDomain: "byteblog-c4f4a.firebaseapp.com",
  projectId: "byteblog-c4f4a",
  storageBucket: "byteblog-c4f4a.firebasestorage.app",
  messagingSenderId: "972129020391",
  appId: "1:972129020391:web:17b41db57ac4c1a76bf542",
  measurementId: "G-KCTJN61THS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth and Database
export const auth = getAuth(app);
export const db = getFirestore(app);
