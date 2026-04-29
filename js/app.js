import { fetchPosts, deletePost, changeUserRole, incrementViewCount, toggleLike, addComment, fetchComments, deleteComment, editComment, reportContent, fetchReports, toggleBookmark, fetchUserPosts, ratePost, ignoreReport, fetchNotifications, markNotificationRead, createNotification } from "./db.js";
import { logoutUser } from "./auth.js";
import { auth, db } from "./firebase-config.js";
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { uploadImage } from "./utils.js";

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
let scrollObserver;

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW registration failed:', err));
    });
}

// Google Translate
window.googleTranslateElementInit = () => {
    new google.translate.TranslateElement({pageLanguage: 'pt', layout: google.translate.TranslateElement.InlineLayout.SIMPLE}, 'google_translate_element');
};

// Initialize Quill
let quill;
document.addEventListener('DOMContentLoaded', async () => {
    // Basic Quill Setup
    if(document.getElementById('quillEditor') && !quill) {
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
export const toggleAuthModal = (show) => authModal.classList.toggle('active', show);
export const togglePostModal = (show) => postModal.classList.toggle('active', show);
export const toggleAdminModal = (show) => adminModal.classList.toggle('active', show);
export const toggleReadModal = (show) => readPostModal.classList.toggle('active', show);

export const toggleProfileModal = (show) => {
    profileModal.classList.toggle('active', show);
    if (show && auth.currentUser) {
        document.getElementById('profileName').value = auth.currentUser.displayName || '';
        document.getElementById('profileEmail').value = auth.currentUser.email || '';
        document.getElementById('profileImage').value = auth.currentUser.photoURL || '';
        document.getElementById('profilePreview').src = auth.currentUser.photoURL || `https://ui-avatars.com/api/?name=${auth.currentUser.displayName || 'User'}`;
        
        const badge = document.getElementById('userRoleBadge');
        if(badge) badge.textContent = `Cargo: ${auth.currentUser.role ? auth.currentUser.role.toUpperCase() : 'REDATOR'}`;
    }
};

export const togglePublicProfileModal = (show) => {
    const modal = document.getElementById('publicProfileModal');
    if(modal) modal.classList.toggle('active', show);
};

export const toggleNotifModal = (show) => {
    const modal = document.getElementById('notifModal');
    if(modal) modal.classList.toggle('active', show);
    if(show) loadNotifications();
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
    if (e.target === readPostModal) toggleReadModal(false);
    if (e.target === document.getElementById('publicProfileModal')) togglePublicProfileModal(false);
    if (e.target === document.getElementById('notifModal')) toggleNotifModal(false);
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

// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const categoriesNav = document.querySelector('.categories-nav');

mobileMenuBtn?.addEventListener('click', () => {
    categoriesNav.classList.toggle('active');
    const icon = mobileMenuBtn.querySelector('i');
    if(categoriesNav.classList.contains('active')) {
        icon.className = 'ph ph-x';
    } else {
        icon.className = 'ph ph-list';
    }
});

// Close mobile menu on category click
document.querySelectorAll('.categories-container a').forEach(link => {
    link.addEventListener('click', () => {
        categoriesNav.classList.remove('active');
        const icon = mobileMenuBtn?.querySelector('i');
        if(icon) icon.className = 'ph ph-list';
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

// Task 17: Advanced Search & Sorting
document.getElementById('searchFilter')?.addEventListener('change', (e) => {
    const sort = e.target.value;
    let posts = [...allPosts];
    
    if(sort === 'oldest') posts.sort((a,b) => a.createdAt?.seconds - b.createdAt?.seconds);
    if(sort === 'popular') posts.sort((a,b) => (b.likes?.length || 0) - (a.likes?.length || 0));
    
    renderMagazine(posts, false);
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
        document.getElementById('openProfileBtn').addEventListener('click', () => {
            loadAuthorDashboard();
            toggleProfileModal(true);
        });
        
        if(isAdmin) {
            document.getElementById('openAdminBtn').addEventListener('click', () => {
                document.getElementById('statTotalPosts').textContent = allPosts.length;
                toggleAdminModal(true);
            });
            // Listener de Denúncias no Painel Admin
            document.querySelector('[data-target="adminReports"]')?.addEventListener('click', () => loadReports());
        }

        renderMagazine(allPosts); // Re-render to show admin actions
        checkNotifications(); // Check notifications on login
        
        // Listeners para inputs de arquivo (UI feedback)
        document.getElementById('postImageFile')?.addEventListener('change', (e) => {
            const fileName = e.target.files[0]?.name || '';
            document.getElementById('postImageFileName').textContent = fileName ? `Selecionado: ${fileName}` : '';
        });
        
        document.getElementById('profileImageFile')?.addEventListener('change', (e) => {
            const fileName = e.target.files[0]?.name || '';
            document.getElementById('profileImageFileName').textContent = fileName ? `Selecionado: ${fileName}` : '';
        });

    } else {
        createPostContainer.classList.add('hidden');
        authSection.innerHTML = `<button class="btn btn-primary" id="loginBtn">Entrar / Cadastrar</button>`;
        document.getElementById('loginBtn')?.addEventListener('click', () => toggleAuthModal(true));
        
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
    
    const formatRelativeTime = (timestamp) => {
        if(!timestamp) return 'Agora';
        const now = new Date();
        const diff = Math.floor((now - new Date(timestamp.seconds * 1000)) / 1000);
        
        if (diff < 60) return 'há poucos segundos';
        if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
        return new Date(timestamp.seconds * 1000).toLocaleDateString('pt-BR');
    };
    
    // Task 20: Infinite Scroll (replacing simple button)
    if(loadMoreBtn) {
        if(sortedPosts.length > currentlyDisplayedCount) {
            loadMoreBtn.style.display = 'block';
            loadMoreBtn.textContent = 'Carregando mais...';
            
            if(!scrollObserver) {
                scrollObserver = new IntersectionObserver((entries) => {
                    if(entries[0].isIntersecting) {
                        currentlyDisplayedCount += 5;
                        renderMagazine(allPosts, false);
                    }
                }, { threshold: 0.1 });
            }
            scrollObserver.disconnect();
            scrollObserver.observe(loadMoreBtn);
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
        
        // Extract raw text for excerpt and Reading Time
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = post.content;
        const rawText = tempDiv.textContent || tempDiv.innerText || '';
        const excerpt = rawText.substring(0, 120) + (rawText.length > 120 ? '...' : '');
        
        // Task 5: Reading Time
        const wordCount = rawText.split(/\s+/).length;
        const readingTime = Math.ceil(wordCount / 200);

        // Task 13: Tags
        const tags = post.tags || [];
        const tagsHtml = tags.map(t => `<span class="post-tag">#${t}</span>`).join(' ');

        postEl.innerHTML = `
            <img src="${post.imageUrl}" alt="${post.title}" class="post-image" onerror="this.src='https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=800'" style="cursor:pointer;" onclick="openReadModal('${post.id}')">
            <div class="post-content">
                <div class="post-meta">
                    <span class="post-category">${post.category}</span>
                    <span class="post-date">${dateStr}</span>
                    <span style="margin-left:auto; font-size:0.75rem; color:var(--text-secondary);"><i class="ph ph-clock"></i> ${formatRelativeTime(post.createdAt)}</span>
                </div>
                <h3 class="post-title" onclick="openReadModal('${post.id}')" style="cursor:pointer;">${post.title} ${draftBadge}</h3>
                <div class="post-tags" style="margin-bottom: 0.5rem; font-size: 0.7rem; color: var(--accent-primary); font-weight: 600;">${tagsHtml}</div>
                <p class="post-excerpt">${excerpt}</p>
                <div class="post-footer" style="display: flex; align-items: center; justify-content: space-between; margin-top: auto;">
                    <div class="post-author" style="cursor:pointer;" onclick="openPublicProfile('${post.authorId}')">
                        <img src="${post.authorPhoto}" alt="${post.authorName}" onerror="this.src='https://ui-avatars.com/api/?name=${post.authorName}'">
                        <span>${post.authorName}</span>
                    </div>
                    <div class="post-actions-group" style="display: flex; align-items: center; gap: 1rem;">
                        <button class="btn-report" onclick="event.stopPropagation(); reportModalItem('post', '${post.id}')" title="Denunciar"><i class="ph ph-warning"></i></button>
                        <div class="post-stats" style="display: flex; gap: 0.5rem; color: var(--text-secondary); font-size: 0.85rem;">
                            <span title="Curtidas"><i class="ph-fill ph-heart"></i> ${post.likes ? post.likes.length : 0}</span>
                            <span title="Visualizações"><i class="ph-fill ph-eye"></i> ${post.views || 0}</span>
                        </div>
                        ${adminHtml}
                    </div>
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
    document.getElementById('readAuthorName').onclick = () => openPublicProfile(post.authorId);
    document.getElementById('readAuthorImg').src = post.authorPhoto;
    document.getElementById('readAuthorImg').onclick = () => openPublicProfile(post.authorId);
    document.getElementById('readDate').textContent = post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : 'Agora';
    document.getElementById('readViews').textContent = post.views;
    document.getElementById('readImage').src = post.imageUrl;
    document.getElementById('readContent').innerHTML = post.content; // Rich text

    // Task 12: Related Posts
    const relatedPostsGrid = document.getElementById('relatedPostsGrid');
    const related = allPosts.filter(p => p.category === post.category && p.id !== postId).slice(0, 3);
    relatedPostsGrid.innerHTML = '';
    if(related.length === 0) {
        relatedPostsGrid.innerHTML = '<p style="color:var(--text-secondary);">Sem outros artigos nesta categoria.</p>';
    } else {
        related.forEach(rp => {
            relatedPostsGrid.innerHTML += `
                <div class="related-card" style="cursor:pointer;" onclick="openReadModal('${rp.id}')">
                    <img src="${rp.imageUrl}" style="width:100%; height:120px; object-fit:cover; border-radius:8px; margin-bottom:0.5rem;">
                    <h4 style="font-size:0.9rem;">${rp.title}</h4>
                </div>
            `;
        });
    }

    // Likes logic
    const likes = post.likes || [];
    const userId = auth.currentUser?.uid;
    const isLiked = userId ? likes.includes(userId) : false;
    
    const likeIcon = document.getElementById('likeIcon');
    document.getElementById('likeCount').textContent = likes.length;

    // Task 11: Bookmark State
    const bookmarkIcon = document.getElementById('bookmarkIcon');
    if(auth.currentUser) {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        const bookmarks = userDoc.exists() ? (userDoc.data().bookmarks || []) : [];
        const isBookmarked = bookmarks.includes(postId);
        bookmarkIcon.className = isBookmarked ? 'ph-fill ph-bookmark-simple' : 'ph ph-bookmark-simple';
        bookmarkIcon.style.color = isBookmarked ? 'var(--accent-primary)' : 'inherit';
        
        document.getElementById('bookmarkBtn').onclick = async () => {
            const success = await toggleBookmark(postId, auth.currentUser.uid, isBookmarked);
            if(success) {
                showToast(isBookmarked ? "Removido dos favoritos." : "Salvo nos favoritos!");
                openReadModal(postId); // Refresh UI
            }
        };
    }

    // Task 15: Stars State
    const ratings = post.ratings || {};
    const myRating = auth.currentUser ? ratings[auth.currentUser.uid] : 0;
    renderStars(myRating);

    document.querySelectorAll('#starRating i').forEach(star => {
        star.onclick = async () => {
            if(!auth.currentUser) {
                showToast("Faça login para avaliar.", "error");
                return;
            }
            const value = parseInt(star.dataset.value);
            const success = await ratePost(postId, auth.currentUser.uid, value);
            if(success) {
                showToast(`Você avaliou este artigo com ${value} estrelas!`);
                renderStars(value);
            }
        };
    });
    
    // Task 8: Social Sharing Buttons
    const postUrl = encodeURIComponent(window.location.href);
    const postTitle = encodeURIComponent(post.title);
    
    const shareHtml = `
        <div class="share-buttons" style="display:flex; gap:0.8rem; align-items:center; margin-left:auto;">
            <span style="font-size:0.8rem; color:var(--text-secondary);">Compartilhar:</span>
            <a href="https://wa.me/?text=${postTitle}%20${postUrl}" target="_blank" title="WhatsApp" style="color:#25d366; font-size:1.2rem;"><i class="ph-fill ph-whatsapp-logo"></i></a>
            <a href="https://twitter.com/intent/tweet?text=${postTitle}&url=${postUrl}" target="_blank" title="Twitter" style="color:#1da1f2; font-size:1.2rem;"><i class="ph-fill ph-twitter-logo"></i></a>
            <a href="https://www.linkedin.com/sharing/share-offsite/?url=${postUrl}" target="_blank" title="LinkedIn" style="color:#0a66c2; font-size:1.2rem;"><i class="ph-fill ph-linkedin-logo"></i></a>
        </div>
    `;

    if(isLiked) {
        likeIcon.classList.remove('ph');
        likeIcon.classList.add('ph-fill');
        likeIcon.style.color = '#ef4444';
    } else {
        likeIcon.classList.remove('ph-fill');
        likeIcon.classList.add('ph');
        likeIcon.style.color = 'inherit';
    }
    
    // Inject share buttons into interaction bar
    const interactionBar = document.querySelector('.interaction-bar');
    if(interactionBar) {
        const oldShare = interactionBar.querySelector('.share-buttons');
        if(oldShare) oldShare.remove();
        interactionBar.insertAdjacentHTML('beforeend', shareHtml);
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

// Handle Post Submit (Moved from db.js for UI control)
document.getElementById('createPostForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!auth.currentUser || (auth.currentUser.role !== 'admin' && auth.currentUser.role !== 'escritor')) {
        showToast("Você não tem permissão para publicar.", "error");
        return;
    }

    const postId = document.getElementById('postIdInput').value;
    const title = document.getElementById('postTitle').value;
    const category = document.getElementById('postCategory').value;
    const tags = document.getElementById('postTags').value.split(',').map(t => t.trim()).filter(t => t);
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
        if (imageFile) {
            postBtn.textContent = 'Enviando imagem...';
            imageUrl = await uploadImage(imageFile);
        }

        if(postId) {
            await updateDoc(doc(db, 'posts', postId), {
                title,
                category,
                tags,
                imageUrl: imageUrl || "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=800",
                content,
                isDraft
            });
            showToast("Artigo atualizado com sucesso!", "success");
        } else {
            await addDoc(collection(db, 'posts'), {
                title,
                category,
                tags,
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
        
        // Refresh feed without full reload if possible
        allPosts = await fetchPosts();
        renderMagazine(allPosts);
        
    } catch (error) {
        console.error("Error saving document: ", error);
        showToast("Erro ao salvar o artigo.", "error");
    } finally {
        postBtn.disabled = false;
        postBtn.textContent = 'Publicar Artigo';
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
        const isAdmin = auth.currentUser?.role === 'admin';
        const isAuthor = auth.currentUser?.uid === c.authorId;
        
        const adminTools = `
            <div class="comment-admin-tools">
                ${isAuthor ? `<button class="btn-edit-comment" data-id="${c.id}" data-text="${c.text}" title="Editar"><i class="ph ph-pencil"></i></button>` : ''}
                <button class="btn-report" onclick="reportModalItem('comment', '${c.id}', '${currentReadPostId}')" title="Denunciar"><i class="ph ph-warning"></i></button>
                ${isAdmin ? `<button class="btn-delete-comment" data-id="${c.id}" title="Excluir"><i class="ph-fill ph-trash"></i></button>` : ''}
            </div>
        `;

        list.innerHTML += `
            <div class="comment-card" id="comment-${c.id}">
                <img src="${c.authorPhoto}" alt="${c.authorName}">
                <div class="comment-card-content">
                    <h4>${c.authorName} <span>${d}</span></h4>
                    <p class="comment-text">${c.text}</p>
                </div>
                ${adminTools}
            </div>
        `;
    });

    // Attach Comment Listeners
    document.querySelectorAll('.btn-delete-comment').forEach(btn => {
        btn.onclick = async (e) => {
            const commentId = e.currentTarget.dataset.id;
            if(confirm("Deseja excluir este comentário?")) {
                const success = await deleteComment(currentReadPostId, commentId);
                if(success) {
                    showToast("Comentário excluído.");
                    loadComments(currentReadPostId);
                }
            }
        };
    });

    document.querySelectorAll('.btn-edit-comment').forEach(btn => {
        btn.onclick = (e) => {
            const id = e.currentTarget.dataset.id;
            const oldText = e.currentTarget.dataset.text;
            const card = document.getElementById(`comment-${id}`);
            const p = card.querySelector('.comment-text');
            
            p.innerHTML = `
                <textarea class="edit-comment-input" style="width:100%; padding:0.5rem; background:var(--bg-secondary); border:1px solid var(--glass-border); color:var(--text-primary); border-radius:4px;">${oldText}</textarea>
                <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                    <button class="btn btn-accent btn-sm save-edit-btn" data-id="${id}">Salvar</button>
                    <button class="btn btn-outline btn-sm cancel-edit-btn">Cancelar</button>
                </div>
            `;
            
            card.querySelector('.cancel-edit-btn').onclick = () => loadComments(currentReadPostId);
            card.querySelector('.save-edit-btn').onclick = async (ev) => {
                const newText = card.querySelector('.edit-comment-input').value.trim();
                if(!newText) return;
                const success = await editComment(currentReadPostId, id, newText);
                if(success) {
                    showToast("Comentário editado.");
                    loadComments(currentReadPostId);
                }
            };
        };
    });
};

const renderStars = (rating) => {
    document.querySelectorAll('#starRating i').forEach(star => {
        const val = parseInt(star.dataset.value);
        if(val <= rating) {
            star.className = 'ph-fill ph-star';
            star.style.color = '#f59e0b';
        } else {
            star.className = 'ph ph-star';
            star.style.color = 'inherit';
        }
    });
};

// Task 10: Public Profile
window.openPublicProfile = async (authorId) => {
    const modal = document.getElementById('publicProfileModal');
    togglePublicProfileModal(true);
    
    // UI Loading state
    document.getElementById('pubAuthorName').textContent = "Carregando...";
    document.getElementById('pubAuthorPosts').innerHTML = '<div class="loader"></div>';
    
    // Fetch User Info (from first post found or from users collection)
    const userDoc = await getDoc(doc(db, "users", authorId));
    if(userDoc.exists()) {
        const data = userDoc.data();
        document.getElementById('pubAuthorImg').src = data.photoURL || `https://ui-avatars.com/api/?name=${data.username}`;
        document.getElementById('pubAuthorName').textContent = data.username;
        document.getElementById('pubAuthorRole').textContent = data.role;
    }

    const posts = await fetchUserPosts(authorId);
    document.getElementById('pubPostCount').textContent = posts.length;
    
    let totalLikes = 0;
    posts.forEach(p => totalLikes += (p.likes ? p.likes.length : 0));
    document.getElementById('pubLikeCount').textContent = totalLikes;

    // Task 14: Badges
    const badgeContainer = document.createElement('div');
    badgeContainer.style.cssText = "display:flex; justify-content:center; gap:0.5rem; margin-bottom:1.5rem;";
    if(posts.length >= 5) badgeContainer.innerHTML += `<span class="badge" title="Publicou mais de 5 artigos" style="background:#10b981; color:white; padding:0.2rem 0.6rem; border-radius:20px; font-size:0.7rem;">🖋️ ESCRITOR</span>`;
    if(totalLikes >= 50) badgeContainer.innerHTML += `<span class="badge" title="Recebeu mais de 50 curtidas" style="background:#f59e0b; color:white; padding:0.2rem 0.6rem; border-radius:20px; font-size:0.7rem;">🔥 POPULAR</span>`;
    
    const roleEl = document.getElementById('pubAuthorRole');
    const oldBadge = roleEl.nextSibling;
    if(oldBadge && oldBadge.className === 'badge-wrapper') oldBadge.remove();
    const wrapper = document.createElement('div');
    wrapper.className = 'badge-wrapper';
    wrapper.appendChild(badgeContainer);
    roleEl.after(wrapper);

    const list = document.getElementById('pubAuthorPosts');
    list.innerHTML = '';
    posts.slice(0, 5).forEach(p => {
        list.innerHTML += `
            <div style="padding:0.8rem; border-bottom:1px solid var(--glass-border); cursor:pointer;" onclick="togglePublicProfileModal(false); openReadModal('${p.id}')">
                <h4 style="font-size:0.95rem;">${p.title}</h4>
                <p style="font-size:0.8rem; color:var(--text-secondary);">${p.category}</p>
            </div>
        `;
    });
};

// Task 4: Report Item
window.reportModalItem = async (type, targetId, postId = null) => {
    const reason = prompt("Por que você deseja denunciar este conteúdo? (Ex: Spam, Ofensa, Fake News)");
    if(!reason) return;
    
    const success = await reportContent(type, targetId, reason, postId);
    if(success) {
        showToast("Obrigado pela denúncia. Vamos analisar o conteúdo.", "success");
    } else {
        showToast("Erro ao enviar denúncia.", "error");
    }
};

// Admin: Load Reports
const loadReports = async () => {
    const list = document.getElementById('reportsList');
    list.innerHTML = '<div class="loader"></div>';
    
    const reports = await fetchReports();
    list.innerHTML = '';
    
    if(reports.length === 0) {
        list.innerHTML = '<p style="color: var(--text-secondary);">Nenhuma denúncia ativa.</p>';
        return;
    }
    
    reports.forEach(r => {
        const d = r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : 'Agora';
        // Escape single quotes for the onclick string
        const escapedReason = (r.reason || '').replace(/'/g, "\\'");
        list.innerHTML += `
            <div class="report-card">
                <div class="report-info">
                    <h4>Denúncia de ${r.type === 'post' ? 'Artigo' : 'Comentário'}</h4>
                    <p><strong>Motivo:</strong> ${r.reason}</p>
                    <p><strong>Por:</strong> ${r.reporterName} em ${d}</p>
                    <p style="font-size:0.7rem; margin-top:0.3rem;">ID Alvo: ${r.targetId}</p>
                </div>
                <div class="report-actions" style="display:flex; gap:0.5rem;">
                    <button class="btn btn-sm btn-accent" onclick="window.respondToReport('${r.id}', '${r.reporterId}', '${escapedReason}')">Responder</button>
                    <button class="btn btn-sm btn-outline" onclick="window.ignoreReport('${r.id}', '${r.reporterId}', '${escapedReason}')">Ignorar</button>
                </div>
            </div>
        `;
    });
};

// Global for Admin Reports
window.ignoreReport = async (reportId, reporterId = null, reason = "") => {
    if(confirm("Deseja ignorar esta denúncia?")) {
        const success = await ignoreReport(reportId, reporterId, reason);
        if(success) {
            showToast("Denúncia ignorada.");
            loadReports();
        }
    }
};

window.respondToReport = async (reportId, reporterId, originalReason) => {
    const message = prompt(`Responda para o denunciante (Denúncia: ${originalReason}):`);
    if(!message) return;
    
    try {
        await createNotification(reporterId, `A moderação respondeu à sua denúncia: "${message}"`, 'success');
        // Optional: archive the report after responding
        if(confirm("Deseja arquivar esta denúncia agora que respondeu?")) {
            await deleteDoc(doc(db, 'reports', reportId));
            loadReports();
        }
        showToast("Resposta enviada!");
    } catch (e) {
        showToast("Erro ao enviar resposta.", "error");
    }
};

// Task 18: Notifications Logic
const loadNotifications = async () => {
    if(!auth.currentUser) return;
    const list = document.getElementById('notifList');
    list.innerHTML = '<div class="loader"></div>';
    
    const notifications = await fetchNotifications(auth.currentUser.uid);
    list.innerHTML = '';
    
    if(notifications.length === 0) {
        list.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding: 2rem;">Nenhuma notificação.</p>';
        document.getElementById('notifBadge').style.display = 'none';
        return;
    }

    const unread = notifications.filter(n => !n.read).length;
    document.getElementById('notifBadge').style.display = unread > 0 ? 'block' : 'none';

    notifications.forEach(n => {
        const d = n.createdAt ? new Date(n.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : 'Agora';
        const opacity = n.read ? '0.6' : '1';
        list.innerHTML += `
            <div class="notif-item" style="padding:1rem; border-bottom:1px solid var(--glass-border); opacity:${opacity}; cursor:pointer;" onclick="window.markNotifRead('${n.id}')">
                <p style="font-size:0.9rem;">${n.message}</p>
                <span style="font-size:0.75rem; color:var(--text-secondary);">${d}</span>
            </div>
        `;
    });
};

window.markNotifRead = async (id) => {
    await markNotificationRead(id);
    loadNotifications();
};

document.getElementById('notifBtn')?.addEventListener('click', () => toggleNotifModal(true));

// Check for unread notifications on load
const checkNotifications = async () => {
    if(auth.currentUser) {
        const notifications = await fetchNotifications(auth.currentUser.uid);
        const unread = notifications.filter(n => !n.read).length;
        document.getElementById('notifBadge').style.display = unread > 0 ? 'block' : 'none';
    }
};

// Task 6: Reading Progress
window.onscroll = () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    const progressBar = document.getElementById("readingProgress");
    if(progressBar) progressBar.style.width = scrolled + "%";
};

// Task 7: Theme Switcher
const themeToggle = document.getElementById('themeToggle');
const currentTheme = localStorage.getItem('theme') || 'dark';

if(currentTheme === 'light') {
    document.body.classList.add('light-theme');
    themeToggle.innerHTML = '<i class="ph ph-sun"></i>';
}

themeToggle?.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
    themeToggle.innerHTML = theme === 'light' ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>';
});

// Task 16: Load Author Dashboard
const loadAuthorDashboard = async () => {
    if(!auth.currentUser) return;
    const posts = allPosts.filter(p => p.authorId === auth.currentUser.uid);
    let views = 0;
    let likes = 0;
    posts.forEach(p => {
        views += (p.views || 0);
        likes += (p.likes ? p.likes.length : 0);
    });
    document.getElementById('userTotalViews').textContent = views;
    document.getElementById('userTotalLikes').textContent = likes;
};

// Toast
export const showToast = (message, type = 'success') => {
    const toast = document.getElementById('toast');
    const icon = type === 'success' ? '<i class="ph-fill ph-check-circle" style="color: #10b981;"></i>' : '<i class="ph-fill ph-warning-circle" style="color: #ef4444;"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 3000);
};