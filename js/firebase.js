import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBOiMnCm2psJWqCuticXWgDB4zIrdQRw54",
  authDomain: "epilepsy-record.firebaseapp.com",
  projectId: "epilepsy-record",
  storageBucket: "epilepsy-record.firebasestorage.app",
  messagingSenderId: "624779668085",
  appId: "1:624779668085:web:8c70e4220b4a13e2ad263c"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);