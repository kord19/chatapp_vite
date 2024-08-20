// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getAuth} from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCsKoIb8218SCTe_K6M2hZJoMeuWr0Oolk",
  authDomain: "superchat-30147.firebaseapp.com",
  projectId: "superchat-30147",
  storageBucket: "superchat-30147.appspot.com",
  messagingSenderId: "163631102110",
  appId: "1:163631102110:web:7242ce296a550d7ccb238f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export {auth,app}