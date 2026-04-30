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
    arrayRemove,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { renderMagazine, togglePostModal } from "./app.js";
import { showToast } from "./utils.js";
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
export const addComment = async (postId, text, parentId = null) => {
    try {
        const commentsCol = collection(db, `posts/${postId}/comments`);
        await addDoc(commentsCol, {
            text,
            parentId,
            authorId: auth.currentUser.uid,
            authorName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
            authorPhoto: auth.currentUser.photoURL || "https://ui-avatars.com/api/?name=" + (auth.currentUser.displayName || auth.currentUser.email),
            createdAt: serverTimestamp()
        });
        
        // Award XP for commenting
        await addUserXP(auth.currentUser.uid, 5);
        
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

// Edit Comment
export const editComment = async (postId, commentId, newText) => {
    try {
        const commentRef = doc(db, `posts/${postId}/comments`, commentId);
        await updateDoc(commentRef, {
            text: newText,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error("Error editing comment:", error);
        showToast("Erro ao editar comentário.", "error");
        return false;
    }
};

// Report Content
export const reportContent = async (type, targetId, reason, postId = null) => {
    try {
        const reportsCol = collection(db, 'reports');
        await addDoc(reportsCol, {
            type, // 'post' or 'comment'
            targetId,
            postId, // if it's a comment, we need the post id to find it
            reason,
            reporterId: auth.currentUser?.uid || 'anonymous',
            reporterName: auth.currentUser?.displayName || 'Anônimo',
            status: 'pending',
            createdAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error("Error reporting content:", error);
        return false;
    }
};

// Fetch Reports
export const fetchReports = async () => {
    try {
        const reportsCol = collection(db, 'reports');
        const q = query(reportsCol, orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const reports = [];
        snap.forEach(d => reports.push({ id: d.id, ...d.data() }));
        return reports;
    } catch (error) {
        console.error("Error fetching reports:", error);
        return [];
    }
};

// Ignore Report
export const ignoreReport = async (reportId, reporterId = null, reason = "") => {
    try {
        const reportRef = doc(db, 'reports', reportId);
        await deleteDoc(reportRef);
        
        if(reporterId) {
            await createNotification(reporterId, `Sua denúncia sobre "${reason}" foi analisada e arquivada pela moderação.`, 'info');
        }
        
        return true;
    } catch (error) {
        console.error("Error ignoring report:", error);
        return false;
    }
};

// Toggle Bookmark
export const toggleBookmark = async (postId, userId, isBookmarked) => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            bookmarks: isBookmarked ? arrayRemove(postId) : arrayUnion(postId)
        });
        return true;
    } catch (error) {
        console.error("Error toggling bookmark:", error);
        return false;
    }
};

// Fetch User Posts (for Public Profile)
export const fetchUserPosts = async (authorId) => {
    try {
        const q = query(collection(db, 'posts'), where('authorId', '==', authorId), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const posts = [];
        snap.forEach(d => posts.push({ id: d.id, ...d.data() }));
        return posts;
    } catch (error) {
        console.error("Error fetching user posts:", error);
        return [];
    }
};

// Rate Post
export const ratePost = async (postId, userId, rating) => {
    try {
        const postRef = doc(db, 'posts', postId);
        // We'll store ratings as an object mapping userId to rating value
        await updateDoc(postRef, {
            [`ratings.${userId}`]: rating
        });
        return true;
    } catch (error) {
        console.error("Error rating post:", error);
        return false;
    }
};

// --- Notifications ---

// Create Notification
export const createNotification = async (userId, message, type = 'info') => {
    try {
        await addDoc(collection(db, 'notifications'), {
            userId,
            message,
            type,
            read: false,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error creating notification:", error);
    }
};

// Fetch User Notifications
export const fetchNotifications = async (userId) => {
    try {
        const q = query(collection(db, 'notifications'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const notifications = [];
        snap.forEach(d => notifications.push({ id: d.id, ...d.data() }));
        return notifications;
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return [];
    }
};

// Mark Notification as Read
export const markNotificationRead = async (notificationId) => {
    try {
        const notifRef = doc(db, 'notifications', notificationId);
        await updateDoc(notifRef, { read: true });
        return true;
    } catch (error) {
        console.error("Error marking notification read:", error);
        return false;
    }
};

// --- Engagement Features (Phase 2) ---

export const subscribeNewsletter = async (email) => {
    try {
        const newsletterCol = collection(db, 'newsletter');
        const q = query(newsletterCol, where("email", "==", email));
        const snap = await getDocs(q);
        if(!snap.empty) {
            showToast("Este e-mail já está inscrito!", "info");
            return false;
        }
        await addDoc(newsletterCol, {
            email,
            subscribedAt: serverTimestamp()
        });
        showToast("Inscrição realizada com sucesso!", "success");
        return true;
    } catch (error) {
        console.error("Error subscribing to newsletter:", error);
        return false;
    }
};

export const toggleFollowAuthor = async (authorId) => {
    if(!auth.currentUser) {
        showToast("Faça login para seguir autores.", "error");
        return false;
    }
    try {
        const userId = auth.currentUser.uid;
        if(userId === authorId) {
            showToast("Você não pode seguir a si mesmo.", "info");
            return false;
        }
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        const following = userDoc.exists() ? (userDoc.data().following || []) : [];
        const isFollowing = following.includes(authorId);
        await updateDoc(userRef, {
            following: isFollowing ? arrayRemove(authorId) : arrayUnion(authorId)
        });
        const authorRef = doc(db, 'users', authorId);
        await updateDoc(authorRef, {
            followers: isFollowing ? arrayRemove(userId) : arrayUnion(userId)
        });
        showToast(isFollowing ? "Deixou de seguir o autor." : "Seguindo o autor!", "success");
        return true;
    } catch (error) {
        console.error("Error toggling follow:", error);
        return false;
    }
};

export const addUserXP = async (userId, amount) => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            xp: increment(amount)
        });
    } catch (error) {
        console.error("Error adding XP:", error);
    }
};

// --- Article Management ---

export const savePost = async (postData, postId = null) => {
    try {
        if (postId) {
            await updateDoc(doc(db, 'posts', postId), {
                ...postData,
                updatedAt: serverTimestamp()
            });
            showToast("Artigo atualizado com sucesso!");
        } else {
            await addDoc(collection(db, 'posts'), {
                ...postData,
                createdAt: serverTimestamp(),
                views: 0,
                likes: []
            });
            showToast("Artigo publicado com sucesso!");
            await addUserXP(auth.currentUser.uid, 50); // XP for posting
        }
        return true;
    } catch (error) {
        console.error("Error saving post:", error);
        showToast("Erro ao salvar artigo.", "error");
        return false;
    }
};

