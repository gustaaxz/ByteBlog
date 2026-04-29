import { db } from "./firebase-config.js";
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    orderBy, 
    serverTimestamp,
    deleteDoc,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { renderPosts, showToast, togglePostModal } from "./app.js";
import { auth } from "./firebase-config.js";

// Collection Reference
const postsCol = collection(db, 'posts');

// Fetch Posts
export const fetchPosts = async () => {
    try {
        const q = query(postsCol, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const posts = [];
        querySnapshot.forEach((doc) => {
            posts.push({ id: doc.id, ...doc.data() });
        });
        renderPosts(posts);
        return posts;
    } catch (error) {
        console.error("Error fetching posts:", error);
        showToast("Erro ao carregar os posts.", "error");
        return [];
    }
};

// Create Post Form Listener
document.getElementById('createPostForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!auth.currentUser) {
        showToast("Você precisa estar logado para postar.", "error");
        return;
    }

    const title = document.getElementById('postTitle').value;
    const category = document.getElementById('postCategory').value;
    const imageUrl = document.getElementById('postImage').value;
    const content = document.getElementById('postContent').value;

    const postBtn = document.getElementById('submitPostBtn');
    postBtn.disabled = true;
    postBtn.textContent = 'Publicando...';

    try {
        await addDoc(postsCol, {
            title,
            category,
            imageUrl: imageUrl || "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=800&auto=format&fit=crop", // Placeholder image
            content,
            authorName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
            authorId: auth.currentUser.uid,
            authorPhoto: auth.currentUser.photoURL || "https://ui-avatars.com/api/?name=" + (auth.currentUser.displayName || auth.currentUser.email),
            createdAt: serverTimestamp()
        });

        showToast("Artigo publicado com sucesso!", "success");
        e.target.reset();
        togglePostModal(false);
        fetchPosts(); // Refresh feed
    } catch (error) {
        console.error("Error adding document: ", error);
        showToast("Erro ao publicar o artigo.", "error");
    } finally {
        postBtn.disabled = false;
        postBtn.textContent = 'Publicar Artigo';
    }
});

// Admin Functions
export const deletePost = async (postId) => {
    try {
        await deleteDoc(doc(db, 'posts', postId));
        showToast("Artigo excluído com sucesso.", "success");
        return true;
    } catch (error) {
        console.error("Error deleting post:", error);
        showToast("Erro ao excluir artigo.", "error");
        return false;
    }
};
