import { db, auth } from "./firebase-config.js";
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    orderBy, 
    serverTimestamp,
    deleteDoc,
    doc,
    updateDoc,
    where,
    increment,
    arrayUnion,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { renderMagazine, showToast, togglePostModal } from "./app.js";
import { uploadImage } from "./utils.js";

// Collection Reference
const postsCol = collection(db, 'posts');
const usersCol = collection(db, 'users');

// Fetch Posts
export const fetchPosts = async () => {
    try {
        const q = query(postsCol, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const posts = [];
        querySnapshot.forEach((doc) => {
            posts.push({ id: doc.id, ...doc.data() });
        });
        return posts;
    } catch (error) {
        console.error("Error fetching posts:", error);
        showToast("Erro ao carregar os artigos.", "error");
        return [];
    }
};

// Create or Edit Post
document.getElementById('createPostForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!auth.currentUser || (auth.currentUser.role !== 'admin' && auth.currentUser.role !== 'escritor')) {
        showToast("Você não tem permissão para publicar.", "error");
        return;
    }

    const postId = document.getElementById('postIdInput').value;
    const title = document.getElementById('postTitle').value;
    const category = document.getElementById('postCategory').value;
    let imageUrl = document.getElementById('postImage').value;
    const imageFile = document.getElementById('postImageFile').files[0];
    const content = document.getElementById('postContent').value;
    const isDraft = document.getElementById('postIsDraft').checked;

    if (!content || content === '<p><br></p>') {
        showToast("Por favor, escreva o conteúdo do artigo.", "error");
        return;
    }

    const postBtn = document.getElementById('submitPostBtn');
    postBtn.disabled = true;
    postBtn.textContent = 'Salvando...';

    try {
        // Se houver arquivo selecionado, faz o upload primeiro
        if (imageFile) {
            postBtn.textContent = 'Enviando imagem...';
            imageUrl = await uploadImage(imageFile);
        }
        if(postId) {
            // Edit Mode
            await updateDoc(doc(db, 'posts', postId), {
                title,
                category,
                imageUrl: imageUrl || "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=800",
                content,
                isDraft
            });
            showToast("Artigo atualizado com sucesso!", "success");
        } else {
            // Create Mode
            await addDoc(postsCol, {
                title,
                category,
                imageUrl: imageUrl || "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=800",
                content,
                isDraft,
                authorName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
                authorId: auth.currentUser.uid,
                authorPhoto: auth.currentUser.photoURL || "https://ui-avatars.com/api/?name=" + (auth.currentUser.displayName || auth.currentUser.email),
                createdAt: serverTimestamp(),
                views: 0,
                likes: []
            });
            showToast(isDraft ? "Rascunho salvo com sucesso!" : "Artigo publicado com sucesso!", "success");
        }

        e.target.reset();
        togglePostModal(false);
        // We will need to re-fetch and re-render. We can simply trigger a page reload or fetch again.
        setTimeout(() => window.location.reload(), 1000); // Simple reload for now to see fresh data
    } catch (error) {
        console.error("Error saving document: ", error);
        showToast("Erro ao salvar o artigo.", "error");
    } finally {
        postBtn.disabled = false;
        postBtn.textContent = 'Publicar Artigo';
    }
});

// Admin/Writer Delete Post
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

// Admin Change User Role
export const changeUserRole = async (email, newRole) => {
    try {
        const q = query(usersCol, where("email", "==", email));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            showToast("Nenhum usuário encontrado com este e-mail.", "error");
            return;
        }

        const userDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'users', userDoc.id), {
            role: newRole
        });
        
        showToast(`Cargo de ${email} alterado para ${newRole.toUpperCase()}`, "success");
        document.getElementById('changeRoleForm').reset();
    } catch (error) {
        console.error("Error changing role:", error);
        showToast("Erro ao alterar cargo.", "error");
    }
};

// Increment View Count
export const incrementViewCount = async (postId) => {
    try {
        await updateDoc(doc(db, 'posts', postId), {
            views: increment(1)
        });
    } catch (error) {
        console.error("Error incrementing views:", error);
    }
};

// Toggle Like
export const toggleLike = async (postId, userId, isLiked) => {
    try {
        await updateDoc(doc(db, 'posts', postId), {
            likes: isLiked ? arrayRemove(userId) : arrayUnion(userId)
        });
        return true;
    } catch (error) {
        console.error("Error toggling like:", error);
        showToast("Erro ao processar curtida.", "error");
        return false;
    }
};

// Add Comment
export const addComment = async (postId, text) => {
    try {
        const commentsCol = collection(db, `posts/${postId}/comments`);
        await addDoc(commentsCol, {
            text,
            authorId: auth.currentUser.uid,
            authorName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
            authorPhoto: auth.currentUser.photoURL || "https://ui-avatars.com/api/?name=" + (auth.currentUser.displayName || auth.currentUser.email),
            createdAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error("Error adding comment:", error);
        showToast("Erro ao enviar comentário.", "error");
        return false;
    }
};

// Fetch Comments
export const fetchComments = async (postId) => {
    try {
        const commentsCol = collection(db, `posts/${postId}/comments`);
        const q = query(commentsCol, orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const comments = [];
        snap.forEach(d => comments.push({ id: d.id, ...d.data() }));
        return comments;
    } catch (error) {
        console.error("Error fetching comments:", error);
        return [];
    }
};

// Admin Delete Comment
export const deleteComment = async (postId, commentId) => {
    try {
        const commentRef = doc(db, `posts/${postId}/comments`, commentId);
        await deleteDoc(commentRef);
        return true;
    } catch (error) {
        console.error("Error deleting comment:", error);
        showToast("Erro ao excluir comentário.", "error");
        return false;
    }
};