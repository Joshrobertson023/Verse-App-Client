// Import the functions you need from the SDKs you need
import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDUmIBfJLdhVEG1QSSr1oN56xM1XS8ifAk",
  authDomain: "verseapp-13c19.firebaseapp.com",
  projectId: "verseapp-13c19",
  storageBucket: "verseapp-13c19.firebasestorage.app",
  messagingSenderId: "998600803196",
  appId: "1:998600803196:web:f661d5648475f6c51e9af9",
  measurementId: "G-3ECFK613YS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);