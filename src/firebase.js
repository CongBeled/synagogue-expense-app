import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCPdI7aP4IhNiRUnYPpGFtwQoRrGqZUXOw",
  authDomain: "synagogue-expense-app.firebaseapp.com",
  projectId: "synagogue-expense-app",
  storageBucket: "synagogue-expense-app.firebasestorage.app",
  messagingSenderId: "113186930270",
  appId: "1:113186930270:web:1142f731d0464fd874fecf"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
