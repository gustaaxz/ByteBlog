import { auth, db } from "./firebase-config.js";
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
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { toggleAuthModal, updateNavbarForUser, toggleProfileModal } from "./app.js";
import { uploadImage, showToast } from "./utils.js";

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Lógica de Login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const loginInput = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    let emailToLogin = loginInput;

    try {
        // Se não tiver '@', assumimos que é um username. Buscamos o email associado no Firestore.
        if (!loginInput.includes('@')) {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("username", "==", loginInput));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                throw new Error("Usuário não encontrado.");
            }
            emailToLogin = querySnapshot.docs[0].data().email;
        }

        await signInWithEmailAndPassword(auth, emailToLogin, password);
        showToast('Login realizado com sucesso!', 'success');
        toggleAuthModal(false);
        e.target.reset();
    } catch (error) {
        console.error("Login Error:", error);
        showToast('Credenciais inválidas ou usuário não existe.', 'error');
    }
});

// Lógica de Registro
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const username = document.getElementById('registerName').value.trim();

    try {
        // Verifica se o username já existe
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            showToast('Este nome de usuário já está em uso.', 'error');
            return;
        }

        // Cria a conta no Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Atualiza o Profile do Auth
        await updateProfile(user, { displayName: username });

        // Salva os dados no Firestore (Tabela Users com cargo Padrão)
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            username: username,
            email: email,
            role: "redator", // Cargo padrão
            photoURL: "",
            createdAt: new Date()
        });
        
        showToast('Conta criada com sucesso!', 'success');
        toggleAuthModal(false);
        e.target.reset();
    } catch (error) {
        console.error("Register Error:", error);
        showToast(error.message, 'error');
    }
});

// Login com Google
document.getElementById('googleSignIn')?.addEventListener('click', async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Verifica se é a primeira vez (se não tem doc no firestore)
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
            await setDoc(userDocRef, {
                uid: user.uid,
                username: user.displayName || user.email.split('@')[0],
                email: user.email,
                role: "redator", // Cargo padrão
                photoURL: user.photoURL,
                createdAt: new Date()
            });
        }

        showToast(`Bem-vindo, ${user.displayName || user.email}!`, 'success');
        toggleAuthModal(false);
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        showToast(error.message, 'error');
    }
});

// Edição de Perfil
document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const newName = document.getElementById('profileName').value.trim();
    const newEmail = document.getElementById('profileEmail').value.trim();
    let newPhoto = document.getElementById('profileImage').value.trim();
    const photoFile = document.getElementById('profileImageFile').files[0];

    const btn = document.getElementById('saveProfileBtn');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    try {
        // Se houver um arquivo, faz o upload primeiro
        if (photoFile) {
            btn.textContent = 'Enviando imagem...';
            newPhoto = await uploadImage(photoFile);
        }
        // Update Auth Profile
        await updateProfile(user, {
            displayName: newName,
            photoURL: newPhoto || user.photoURL
        });

        // Update Firestore Document
        await setDoc(doc(db, "users", user.uid), {
            username: newName,
            photoURL: newPhoto || user.photoURL
        }, { merge: true });

        // Update Email if changed (Pode exigir reautenticação)
        /* if (newEmail !== user.email) {
            await updateEmail(user, newEmail);
        } */ // Desativado para evitar problemas de reautenticação complexos no momento

        showToast('Perfil atualizado com sucesso!', 'success');
        toggleProfileModal(false);
        updateNavbarForUser(auth.currentUser);
    } catch (error) {
        console.error("Profile Update Error:", error);
        showToast('Erro ao atualizar perfil: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Salvar Alterações';
    }
});

// Watch Auth State
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Fetch role
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            user.role = userDoc.data().role;
            // Fallback for hardcoded admin
            if (user.email === "gustavoooschmitt@gmail.com") user.role = "admin";
        } else {
            user.role = user.email === "gustavoooschmitt@gmail.com" ? "admin" : "redator";
        }
    }
    updateNavbarForUser(user);
});

export const logoutUser = async () => {
    try {
        await signOut(auth);
        showToast('Você saiu da sua conta.', 'success');
    } catch (error) {
        console.error("Sign Out Error:", error);
    }
};