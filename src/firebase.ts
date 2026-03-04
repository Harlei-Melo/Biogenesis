// src/firebase.ts
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyAqch19zz4yKDvYsGIW8i-CzXX1aV7Ii1k",
  authDomain: "abiogenese-be72f.firebaseapp.com",
  projectId: "abiogenese-be72f",
  storageBucket: "abiogenese-be72f.firebasestorage.app",
  messagingSenderId: "1034587023331",
  appId: "1:1034587023331:web:ffa57130b83ba0706ba2d6"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);