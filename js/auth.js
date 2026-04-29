import { auth } from "./firebase-config.js";
import { 
    signInWithPopup, 
    GoogleAuthProvider, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { showToast, toggleAuthModal, updateNavbarForUser } from "./app.js";

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Listeners for Auth Forms
document.getElementById('googleSignIn')?.addEventListener('click', async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        showToast(`Bem-vindo, ${user.displayName || user.email}!`, 'success');
        toggleAuthModal(false);
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        showToast(error.message, 'error');
    }
});

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Login realizado com sucesso!', 'success');
        toggleAuthModal(false);
        e.target.reset();
    } catch (error) {
        console.error("Login Error:", error);
        showToast('Email ou senha inválidos.', 'error');
    }
});

document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const name = document.getElementById('registerName').value; // We can update profile later if needed

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        showToast('Conta criada com sucesso!', 'success');
        toggleAuthModal(false);
        e.target.reset();
    } catch (error) {
        console.error("Register Error:", error);
        showToast(error.message, 'error');
    }
});

// Watch Auth State
onAuthStateChanged(auth, (user) => {
    updateNavbarForUser(user);
});

// Export sign out so it can be used in app.js dynamically
export const logoutUser = async () => {
    try {
        await signOut(auth);
        showToast('Você saiu da sua conta.', 'success');
    } catch (error) {
        console.error("Sign Out Error:", error);
    }
};
