import { auth } from "./firebase-config.js";
import { 
    signInWithPopup, 
    GoogleAuthProvider, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile,
    updateEmail
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { showToast, toggleAuthModal, updateNavbarForUser, toggleProfileModal } from "./app.js";

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
        
        // Update profile with name immediately
        await updateProfile(userCredential.user, {
            displayName: name
        });
        
        showToast('Conta criada com sucesso!', 'success');
        toggleAuthModal(false);
        e.target.reset();
    } catch (error) {
        console.error("Register Error:", error);
        showToast(error.message, 'error');
    }
});

// Profile Update Listener
document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const newName = document.getElementById('profileName').value;
    const newEmail = document.getElementById('profileEmail').value;
    const newPhoto = document.getElementById('profileImage').value;

    const btn = document.getElementById('saveProfileBtn');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    try {
        // Update Name and Photo
        await updateProfile(user, {
            displayName: newName,
            photoURL: newPhoto || user.photoURL
        });

        // Update Email if changed
        if (newEmail !== user.email) {
            await updateEmail(user, newEmail);
        }

        showToast('Perfil atualizado com sucesso!', 'success');
        toggleProfileModal(false);
        updateNavbarForUser(auth.currentUser); // Refresh UI
    } catch (error) {
        console.error("Profile Update Error:", error);
        if (error.code === 'auth/requires-recent-login') {
            showToast('Para alterar o e-mail, por favor faça login novamente.', 'error');
            logoutUser();
            toggleProfileModal(false);
            toggleAuthModal(true);
        } else {
            showToast('Erro ao atualizar perfil: ' + error.message, 'error');
        }
    } finally {
        btn.disabled = false;
        btn.textContent = 'Salvar Alterações';
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
