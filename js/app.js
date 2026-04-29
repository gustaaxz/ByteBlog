import { fetchPosts, deletePost, changeUserRole, incrementViewCount, toggleLike, addComment, fetchComments } from "./db.js";
import { logoutUser } from "./auth.js";
import { auth } from "./firebase-config.js";

// DOM Elements
const authModal = document.getElementById('authModal');
const postModal = document.getElementById('postModal');
const profileModal = document.getElementById('profileModal');
const adminModal = document.getElementById('adminModal');
const readPostModal = document.getElementById('readPostModal');
const loginBtn = document.getElementById('loginBtn');
const openCreatePostModalBtn = document.getElementById('openCreatePostModal');
const closeButtons = document.querySelectorAll('.close-modal, .close-modal-btn');
const authTabs = document.querySelectorAll('.auth-tabs .tab');
const authForms = document.querySelectorAll('.auth-form');
const navLinks = document.querySelectorAll('.categories-container a');
const authSection = document.getElementById('authSection');
const createPostContainer = document.getElementById('createPostContainer');
const postsGrid = document.getElementById('postsGrid');
const heroSection = document.getElementById('heroSection');
const searchInput = document.getElementById('searchInput');
const loadMoreBtn = document.getElementById('loadMoreBtn');

let allPosts = []; 
let currentlyDisplayedCount = 5; // Pagination step
let currentCategoryFilter = 'all';

// Initialize Quill
let quill;
document.addEventListener('DOMContentLoaded', async () => {
    // Basic Quill Setup
    if(document.getElementById('quillEditor')) {
        quill = new Quill('#quillEditor', {
            theme: 'snow',
            placeholder: 'Escreva seu artigo com formatação rica...',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link', 'image', 'video'],
                    ['clean']
                ]
            }
        });
        
        // Sync Quill to Hidden Input on change
        quill.on('text-change', () => {
            document.getElementById('postContent').value = quill.root.innerHTML;
        });
    }

    allPosts = await fetchPosts();
    renderMagazine(allPosts);
});

// --- Modal Handling ---
export const toggleModal = (modal, show) => {
    if(show) modal.classList.add('active');
    else modal.classList.remove('active');
};

export const toggleAuthModal = (show) => toggleModal(authModal, show);
export const togglePostModal = (show) => toggleModal(postModal, show);
export const toggleAdminModal = (show) => toggleModal(adminModal, show);
export const toggleReadModal = (show) => toggleModal(readPostModal, show);

export const toggleProfileModal = (show) => {
    toggleModal(profileModal, show);
    if (show && auth.currentUser) {
        document.getElementById('profileName').value = auth.currentUser.displayName || '';
        document.getElementById('profileEmail').value = auth.currentUser.email || '';
        document.getElementById('profileImage').value = auth.currentUser.photoURL || '';
        document.getElementById('profilePreview').src = auth.currentUser.photoURL || `https://ui-avatars.com/api/?name=${auth.currentUser.displayName || 'User'}`;
        
        const badge = document.getElementById('userRoleBadge');
        if(badge) badge.textContent = `Cargo: ${auth.currentUser.role ? auth.currentUser.role.toUpperCase() : 'REDATOR'}`;
    }
};

document.getElementById('profileImage')?.addEventListener('input', (e) => {
    document.getElementById('profilePreview').src = e.target.value || `https://ui-avatars.com/api/?name=${auth.currentUser?.displayName || 'User'}`;
});

loginBtn?.addEventListener('click', () => toggleAuthModal(true));
openCreatePostModalBtn?.addEventListener('click', () => {
    document.getElementById('createPostForm').reset();
    document.getElementById('postIdInput').value = '';
    if(quill) quill.root.innerHTML = '';
    document.getElementById('postModalTitle').textContent = 'Criar Novo Artigo';
    document.getElementById('submitPostBtn').textContent = 'Publicar Artigo';
    togglePostModal(true);
});

closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        toggleAuthModal(false);
        togglePostModal(false);
        toggleProfileModal(false);
        toggleAdminModal(false);
        toggleReadModal(false);
    });
});

window.addEventListener('click', (e) => {
    if (e.target === authModal) toggleAuthModal(false);
    if (e.target === postModal) togglePostModal(false);
    if (e.target === profileModal) toggleProfileModal(false);
    if (e.target === adminModal) toggleAdminModal(false);
    if (e.target === readPostModal) toggleReadModal(false);
});

// Auth Tabs
authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        authTabs.forEach(t => t.classList.remove('active'));
        authForms.forEach(f => f.classList.remove('active'));
        tab.classList.add('active');
        const targetFormId = tab.dataset.tab === 'login' ? 'loginForm' : 'registerForm';
        document.getElementById(targetFormId).classList.add('active');
    });
});

// Admin Tabs
document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-view').forEach(v => v.style.display = 'none');
        
        e.target.classList.add('active');
        document.getElementById(e.target.dataset.target).style.display = 'block';
    });
});

// Admin Change Role
document.getElementById('changeRoleForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('adminUserEmail').value;
    const role = document.getElementById('adminUserRole').value;
    await changeUserRole(email, role);
});

// Search
searchInput?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allPosts.filter(p => 
        p.title.toLowerCase().includes(term) || 
        p.content.toLowerCase().includes(term)
    );
    renderMagazine(filtered, false); // false means don't touch hero if searching specific things, or just re-render feed
});

// Load More
loadMoreBtn?.addEventListener('click', () => {
    currentlyDisplayedCount += 5;
    const filtered = currentCategoryFilter === 'all' 
        ? allPosts 
        : allPosts.filter(post => post.category === currentCategoryFilter);
    renderMagazine(filtered, true); // Update hero if needed, but usually we just want to load more in the grid
});

// Categories
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        currentCategoryFilter = link.dataset.category;
        currentlyDisplayedCount = 5; // reset pagination
        
        if (currentCategoryFilter === 'all') {
            renderMagazine(allPosts);
        } else {
            const filtered = allPosts.filter(post => post.category === currentCategoryFilter);
            renderMagazine(filtered);
        }
    });
});

// UI Update based on Auth
export const updateNavbarForUser = (user) => {
    if (user) {
        const canPost = user.role === 'admin' || user.role === 'escritor';
        if(canPost) {
            createPostContainer.classList.remove('hidden');
        } else {
            createPostContainer.classList.add('hidden');
        }

        const isAdmin = user.role === 'admin';
        const adminBtnHtml = isAdmin ? `<button class="btn btn-outline" id="openAdminBtn" title="Dashboard Admin"><i class="ph ph-shield-check"></i></button>` : '';

        const userName = user.displayName || user.email.split('@')[0];
        const userPhoto = user.photoURL || `https://ui-avatars.com/api/?name=${userName}&background=0ea5e9&color=fff`;

        authSection.innerHTML = `
            ${adminBtnHtml}
            <div class="user-profile" id="openProfileBtn" title="Gerenciar Perfil">
                <img src="${userPhoto}" alt="${userName}">
                <span class="user-name">${userName}</span>
            </div>
            <button class="btn btn-outline" id="logoutBtn">Sair</button>
        `;

        document.getElementById('logoutBtn').addEventListener('click', () => logoutUser());
        document.getElementById('openProfileBtn').addEventListener('click', () => toggleProfileModal(true));
        
        if(isAdmin) {
            document.getElementById('openAdminBtn').addEventListener('click', () => {
                document.getElementById('statTotalPosts').textContent = allPosts.length;
                toggleAdminModal(true);
            });
        }

        renderMagazine(allPosts); // Re-render to show admin actions

    } else {
        createPostContainer.classList.add('hidden');
        authSection.innerHTML = `<button class="btn btn-primary" id="loginBtn">Entrar / Cadastrar</button>`;
        document.getElementById('loginBtn').addEventListener('click', () => toggleAuthModal(true));
        
        if (allPosts.length > 0) renderMagazine(allPosts);
    }
};

// Render Magazine
export const renderMagazine = (posts, updateHero = true) => {
    postsGrid.innerHTML = '';
    
    // Filter out drafts if the user is not admin and not the author
    const currentUser = auth.currentUser;
    const isAdmin = currentUser?.role === 'admin';
    const visiblePosts = posts.filter(p => {
        if(!p.isDraft) return true;
        if(isAdmin) return true;
        if(currentUser && p.authorId === currentUser.uid) return true;
        return false;
    });
    
    if (visiblePosts.length === 0) {
        if(updateHero) heroSection.innerHTML = `<div style="padding: 4rem; text-align: center; color: var(--text-secondary);">Nenhum artigo encontrado.</div>`;
        postsGrid.innerHTML = `<p style="color: var(--text-secondary);">Nenhuma notícia para exibir.</p>`;
        if(loadMoreBtn) loadMoreBtn.style.display = 'none';
        return;
    }

    const sortedPosts = [...visiblePosts].sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds);

    // Pagination logic
    const feedPostsToRender = sortedPosts.slice(0, currentlyDisplayedCount);
    
    if(loadMoreBtn) {
        if(sortedPosts.length > currentlyDisplayedCount) {
            loadMoreBtn.style.display = 'inline-flex';
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }

    // Hero Post (The newest one)
    if(updateHero && sortedPosts.length > 0) {
        const heroPost = sortedPosts[0];
        const dateStr = heroPost.createdAt ? new Date(heroPost.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : 'Postado agora';
        
        heroSection.innerHTML = `
            <img src="${heroPost.imageUrl}" alt="${heroPost.title}" class="hero-bg" onerror="this.src='https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=1200'">
            <div class="hero-overlay" style="cursor:pointer;" onclick="openReadModal('${heroPost.id}')"></div>
            <div class="hero-content-inner">
                <span class="hero-category">${heroPost.category}</span>
                <h1 style="cursor:pointer;" onclick="openReadModal('${heroPost.id}')">${heroPost.title}</h1>
                <div class="hero-meta">
                    <img src="${heroPost.authorPhoto}" alt="${heroPost.authorName}" style="width:30px; height:30px; border-radius:50%;">
                    <span>${heroPost.authorName}</span>
                    <span>•</span>
                    <span>${dateStr}</span>
                </div>
            </div>
        `;
    }

    // Feed Posts - SEM NENHUM SLICE OU FILTRO QUE REMOVA O PRIMEIRO POST
    const feedPosts = sortedPosts.slice(0, currentlyDisplayedCount);

    feedPosts.forEach(post => {
        const dateStr = post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : 'Postado agora';
        
        // Admin Actions
        const isAuthor = auth.currentUser?.uid === post.authorId;
        const canEdit = isAdmin || isAuthor; 
        
        const adminHtml = canEdit ? `
            <div class="admin-actions">
                <button class="btn-admin-edit" data-id="${post.id}" title="Editar"><i class="ph-fill ph-pencil-simple"></i></button>
                <button class="btn-admin-delete" data-id="${post.id}" title="Excluir"><i class="ph-fill ph-trash"></i></button>
            </div>
        ` : '';
        
        const draftBadge = post.isDraft ? `<span class="draft-badge">Rascunho</span>` : '';

        const postEl = document.createElement('article');
        postEl.className = 'post-card';
        postEl.innerHTML = `
            <div class="post-image" onclick="openReadModal('${post.id}')" style="cursor:pointer;">
                <img src="${post.imageUrl}" alt="${post.title}" onerror="this.src='https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=800'">
            </div>
            <div class="post-content">
                <div class="post-meta">
                    <span class="post-category">${post.category}</span>
                    <span class="post-date">${dateStr}</span>
                </div>
                <h3 onclick="openReadModal('${post.id}')" style="cursor:pointer;">${post.title} ${draftBadge}</h3>
                <p>${post.content.replace(/<[^>]*>/g, '').substring(0, 120)}...</p>
                <div class="post-footer">
                    <div class="post-author">
                        <img src="${post.authorPhoto}" alt="${post.authorName}" onerror="this.src='https://ui-avatars.com/api/?name=${post.authorName}'">
                        <span>${post.authorName}</span>
                    </div>
                    <div class="post-stats">
                        <span title="Curtidas"><i class="ph-fill ph-heart"></i> ${post.likes ? post.likes.length : 0}</span>
                        <span title="Visualizações"><i class="ph-fill ph-eye"></i> ${post.views || 0}</span>
                    </div>
                    ${adminHtml}
                </div>
            </div>
        `;
        postsGrid.appendChild(postEl);
    });

    // Attach Listeners - Garantindo que funcionem mesmo após re-render
    attachPostListeners();
};

const attachPostListeners = () => {
    document.querySelectorAll('.btn-admin-delete').forEach(btn => {
        btn.onclick = async (e) => {
            e.stopPropagation();
            const postId = e.currentTarget.dataset.id;
            if (confirm("Tem certeza que deseja excluir este artigo permanentemente?")) {
                const success = await deletePost(postId);
                if (success) {
                    allPosts = allPosts.filter(p => p.id !== postId);
                    renderMagazine(allPosts);
                    showToast("Artigo removido com sucesso!");
                }
            }
        };
    });

    document.querySelectorAll('.btn-admin-edit').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const postId = e.currentTarget.dataset.id;
            const post = allPosts.find(p => p.id === postId);
            if (post) {
                document.getElementById('postIdInput').value = post.id;
                document.getElementById('postTitle').value = post.title;
                document.getElementById('postCategory').value = post.category;
                document.getElementById('postImage').value = post.imageUrl;
                document.getElementById('postIsDraft').checked = post.isDraft;
                if(quill) quill.root.innerHTML = post.content;
                document.getElementById('postModalTitle').textContent = 'Editar Artigo';
                document.getElementById('submitPostBtn').textContent = 'Salvar Alterações';
                togglePostModal(true);
            }
        };
    });
};

// Global function to open modal (so inline onclick works)
let currentReadPostId = null;
window.openReadModal = async (postId) => {
    const post = allPosts.find(p => p.id === postId);
    if(!post) return;
    
    currentReadPostId = postId;
    
    // Increment View
    await incrementViewCount(postId);
    post.views = (post.views || 0) + 1; // Update locally
    
    // Populate Modal
    document.getElementById('readCategory').textContent = post.category;
    document.getElementById('readTitle').textContent = post.title;
    document.getElementById('readAuthorName').textContent = post.authorName;
    document.getElementById('readAuthorImg').src = post.authorPhoto;
    document.getElementById('readDate').textContent = post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : 'Agora';
    document.getElementById('readViews').textContent = post.views;
    document.getElementById('readImage').src = post.imageUrl;
    document.getElementById('readContent').innerHTML = post.content; // Rich text
    
    // Likes logic
    const likes = post.likes || [];
    const userId = auth.currentUser?.uid;
    const isLiked = userId ? likes.includes(userId) : false;
    
    const likeIcon = document.getElementById('likeIcon');
    document.getElementById('likeCount').textContent = likes.length;
    
    if(isLiked) {
        likeIcon.classList.remove('ph');
        likeIcon.classList.add('ph-fill');
        likeIcon.style.color = '#ef4444';
    } else {
        likeIcon.classList.remove('ph-fill');
        likeIcon.classList.add('ph');
        likeIcon.style.color = 'inherit';
    }
    
    // Fetch Comments
    loadComments(postId);
    
    toggleReadModal(true);
};

// Handle Like Button
document.getElementById('likeBtn')?.addEventListener('click', async () => {
    if(!auth.currentUser) {
        showToast("Faça login para curtir artigos.", "error");
        toggleAuthModal(true);
        return;
    }
    
    const post = allPosts.find(p => p.id === currentReadPostId);
    if(!post) return;
    
    const userId = auth.currentUser.uid;
    const likes = post.likes || [];
    const isLiked = likes.includes(userId);
    
    const success = await toggleLike(currentReadPostId, userId, isLiked);
    if(success) {
        if(isLiked) {
            post.likes = likes.filter(id => id !== userId);
        } else {
            post.likes.push(userId);
        }
        
        // Update UI
        const likeIcon = document.getElementById('likeIcon');
        document.getElementById('likeCount').textContent = post.likes.length;
        if(!isLiked) {
            likeIcon.classList.remove('ph');
            likeIcon.classList.add('ph-fill');
            likeIcon.style.color = '#ef4444';
        } else {
            likeIcon.classList.remove('ph-fill');
            likeIcon.classList.add('ph');
            likeIcon.style.color = 'inherit';
        }
        renderMagazine(allPosts, false); // update main feed subtly
    }
});

// Handle Comment Submit
document.getElementById('commentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!auth.currentUser) {
        showToast("Faça login para comentar.", "error");
        toggleAuthModal(true);
        return;
    }
    
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    if(!text) return;
    
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    
    const success = await addComment(currentReadPostId, text);
    if(success) {
        input.value = '';
        showToast("Comentário enviado!", "success");
        loadComments(currentReadPostId);
    }
    
    btn.disabled = false;
});

const loadComments = async (postId) => {
    const list = document.getElementById('commentsList');
    list.innerHTML = '<div class="loader" style="margin: 1rem auto; width: 20px; height: 20px;"></div>';
    
    const comments = await fetchComments(postId);
    document.getElementById('commentCount').textContent = comments.length;
    
    list.innerHTML = '';
    if(comments.length === 0) {
        list.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">Nenhum comentário ainda. Seja o primeiro!</p>';
        return;
    }
    
    comments.forEach(c => {
        const d = c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : 'Agora';
        list.innerHTML += `
            <div class="comment-card">
                <img src="${c.authorPhoto}" alt="${c.authorName}">
                <div class="comment-card-content">
                    <h4>${c.authorName} <span>${d}</span></h4>
                    <p>${c.text}</p>
                </div>
            </div>
        `;
    });
};

// Toast
export const showToast = (message, type = 'success') => {
    const toast = document.getElementById('toast');
    const icon = type === 'success' ? '<i class="ph-fill ph-check-circle" style="color: #10b981;"></i>' : '<i class="ph-fill ph-warning-circle" style="color: #ef4444;"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 3000);
};
