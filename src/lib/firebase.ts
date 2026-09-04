import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, updateProfile, User } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDvv52ue8-1EqI92Uae6DHuyQG3BD9xvcw",
  authDomain: "graderz5-usuarios.firebaseapp.com",
  projectId: "graderz5-usuarios",
  storageBucket: "graderz5-usuarios.firebasestorage.app",
  messagingSenderId: "496402623162",
  appId: "1:496402623162:web:5f31f4d6c4ae7a9e757083",
  measurementId: "G-MFQHKSSM3F"
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Google Sign In with Popup
export const signInWithGoogle = async () => {
  try {
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error in Google Auth:', error);
    throw error;
  }
};

// Sign Out
export const logoutUser = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export { onAuthStateChanged, updateProfile, type User };

