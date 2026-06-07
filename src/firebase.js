import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDHP3-1f-E-NkvmnmRkoMFGYXzDhLjeapo",
  authDomain: "teachers-ai-tool.firebaseapp.com",
  projectId: "teachers-ai-tool",
  storageBucket: "teachers-ai-tool.firebasestorage.app",
  messagingSenderId: "565581902762",
  appId: "1:565581902762:web:259552577b0c40d602f1d3",
  measurementId: "G-RTVZ0XZ65S"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutUser() {
  await signOut(auth);
}
