import { 
    fetchPosts, 
    deletePost, 
    changeUserRole, 
    incrementViewCount, 
    toggleLike, 
    addComment, 
    fetchComments, 
    deleteComment, 
    editComment, 
    reportContent, 
    fetchReports, 
    toggleBookmark, 
    fetchUserPosts, 
    ratePost, 
    ignoreReport, 
    savePost,
    fetchNotifications, 
    markNotificationRead, 
    createNotification, 
    subscribeNewsletter, 
    toggleFollowAuthor, 
    addUserXP 
} from "./db.js";
import { logoutUser } from "./auth.js";
import { auth, db } from "./firebase-config.js";
import { 
    doc, 
    getDoc, 
    updateDoc, 
    addDoc, 
    collection, 
    serverTimestamp, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { uploadImage, showToast } from "./utils.js";

// === THEME MANAGER ===
const applyTheme = () => {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        document.body.classList.add('light-theme');
        if (themeToggle) themeToggle.innerHTML = '<i class="ph ph-sun"></i>';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.classList.remove('light-theme');
        if (themeToggle) themeToggle.innerHTML = '<i class="ph ph-moon"></i>';
    }
};

const smoothTransition = (callback) => {
    if (document.startViewTransition) {
        document.startViewTransition(callback);
    } else {
        callback();
    }
};

// Handle clicks via delegation for robustness
document.addEventListener('click', (e) => {
    const toggle = e.target.closest('#themeToggle');
    if (toggle) {
        const isLight = document.body.classList.toggle('light-theme');
        const theme = isLight ? 'light' : 'dark';
        localStorage.setItem('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
        toggle.innerHTML = isLight ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>';
    }
});

const updateMetaTags = (title, description, image) => {
    document.title = `${title} | Byte Blog`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if(metaDesc) metaDesc.setAttribute('content', description);
    
    // OG Tags
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if(!ogTitle) {
        ogTitle = document.createElement('meta');
        ogTitle.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', title);

    let ogImg = document.querySelector('meta[property="og:image"]');
    if(!ogImg) {
        ogImg = document.createElement('meta');
        ogImg.setAttribute('property', 'og:image');
        document.head.appendChild(ogImg);
    }
    ogImg.setAttribute('content', image);
};

// Run theme logic as soon as possible
const initAutoTheme = () => {
    if (!localStorage.getItem('theme')) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        localStorage.setItem('theme', prefersDark ? 'dark' : 'light');
    }
    applyTheme();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoTheme);
} else {
    initAutoTheme();
}

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
window.quillInstance = window.quillInstance || null;

const initQuill = () => {
    if(document.getElementById('quillEditor') && !window.quillInstance) {
        window.quillInstance = new Quill('#quillEditor', {
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
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    initQuill();
    
    // --- Interactive UI Logic (Phase 1) ---
    
    // Custom Cursor
    const cursor = document.getElementById('cursor');
    
    if(cursor) {
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = `${e.clientX}px`;
            cursor.style.top = `${e.clientY}px`;
        });

        // Hover effects for cursor
        document.querySelectorAll('a, button, .post-card, .user-profile, .logo, .nav-link').forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
                cursor.style.boxShadow = '0 0 20px var(--accent-primary)';
            });
            el.addEventListener('mouseleave', () => {
                cursor.style.transform = 'translate(-50%, -50%) scale(1)';
                cursor.style.boxShadow = '0 0 10px var(--accent-primary)';
            });
        });
    }

    // Scroll to Top
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    if(scrollToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) {
                scrollToTopBtn.classList.add('visible');
            } else {
                scrollToTopBtn.classList.remove('visible');
            }
        });
        
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    allPosts = await fetchPosts();
    renderMagazine(allPosts);

    // Live Preview Synchronization
    const updateLivePreview = () => {
        const title = document.getElementById('postTitle')?.value;
        const category = document.getElementById('postCategory')?.value;
        const tags = document.getElementById('postTags')?.value.split(',').map(t => t.trim()).filter(t => t);
        const imageUrl = document.getElementById('postImage')?.value;
        const content = window.quillInstance ? window.quillInstance.root.innerHTML : '';

        const previewTitle = document.getElementById('previewTitle');
        const previewCategory = document.getElementById('previewCategory');
        const previewImg = document.getElementById('previewImg');
        const previewBody = document.getElementById('previewBody');
        const previewTags = document.getElementById('previewTags');

        if(previewTitle) previewTitle.textContent = title || "Título do seu artigo aparecerá aqui";
        if(previewCategory) previewCategory.textContent = category || "Categoria";
        if(previewImg && imageUrl) previewImg.src = imageUrl;
        
        if(previewBody) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            const rawText = tempDiv.textContent || tempDiv.innerText || "";
            previewBody.textContent = rawText.length > 2 ? rawText.substring(0, 150) + (rawText.length > 150 ? '...' : '') : "O conteúdo do seu artigo começará a aparecer aqui conforme você digita...";
        }

        if(previewTags) {
            previewTags.innerHTML = (tags || []).map(t => `<span class="preview-tag">#${t}</span>`).join(' ');
        }
    };

    // Attach listeners for live preview
    ['postTitle', 'postCategory', 'postTags', 'postImage'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', updateLivePreview);
    });

    // Sync Quill to Hidden Input and Preview on change
    if(window.quillInstance) {
        window.quillInstance.on('text-change', () => {
            const content = window.quillInstance.root.innerHTML;
            const input = document.getElementById('postContent');
            if(input) input.value = content;
            updateLivePreview();
            
            // Autosave to LocalStorage
            localStorage.setItem('postDraft', JSON.stringify({
                title: document.getElementById('postTitle').value,
                category: document.getElementById('postCategory').value,
                content: content,
                tags: document.getElementById('postTags').value
            }));
        });
    }

    // Recover Draft
    const savedDraft = localStorage.getItem('postDraft');
    if(savedDraft) {
        const draft = JSON.parse(savedDraft);
        // Only recover if not already editing a post
        if(!document.getElementById('postIdInput').value) {
            document.getElementById('postTitle').value = draft.title || '';
            document.getElementById('postCategory').value = draft.category || '';
            document.getElementById('postTags').value = draft.tags || '';
            if(window.quillInstance) window.quillInstance.root.innerHTML = draft.content || '';
        }
    }

    // Newsletter Listener
    document.getElementById('newsletterForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target.querySelector('input').value;
        const success = await subscribeNewsletter(email);
        if(success) e.target.reset();
    });

    // Export for use when opening modal
    window.updateLivePreview = updateLivePreview;
});

// --- Modal Handling ---
export const toggleAuthModal = (show) => smoothTransition(() => authModal.classList.toggle('active', show));
export const togglePostModal = (show) => smoothTransition(() => postModal.classList.toggle('active', show));
export const toggleAdminModal = (show) => smoothTransition(() => adminModal.classList.toggle('active', show));
export const toggleReadModal = (show) => smoothTransition(() => readPostModal.classList.toggle('active', show));

export const toggleProfileModal = (show) => smoothTransition(() => {
    profileModal.classList.toggle('active', show);
    if (show && auth.currentUser) {
        document.getElementById('profileName').value = auth.currentUser.displayName || '';
        document.getElementById('profileEmail').value = auth.currentUser.email || '';
        document.getElementById('profileImage').value = auth.currentUser.photoURL || '';
        document.getElementById('profilePreview').src = auth.currentUser.photoURL || `https://ui-avatars.com/api/?name=${auth.currentUser.displayName || 'User'}`;
        
        const badge = document.getElementById('userRoleBadge');
        if(badge) badge.textContent = `Cargo: ${auth.currentUser.role ? auth.currentUser.role.toUpperCase() : 'REDATOR'}`;
    }
});

export const togglePublicProfileModal = (show) => {
    const modal = document.getElementById('publicProfileModal');
    if(modal) modal.classList.toggle('active', show);
};

export const toggleNotifModal = (show) => {
    const modal = document.getElementById('notifModal');
    if(modal) modal.classList.toggle('active', show);
    if(show) loadNotifications();
};

export const updateNavbarForUser = (user) => {
    const authSection = document.getElementById('authSection');
    const createPostContainer = document.getElementById('createPostContainer');
    
    if (user) {
        const isAdmin = user.role === 'admin';
        const isWriter = user.role === 'escritor' || isAdmin;
        
        if (createPostContainer) {
            createPostContainer.classList.toggle('hidden', !isWriter);
        }

        authSection.innerHTML = `
            <div class="user-nav" style="display:flex; align-items:center; gap:1.2rem;">
                ${isAdmin ? `<button class="btn btn-outline" id="adminBtn" title="Painel Admin"><i class="ph ph-shield-check"></i> Admin</button>` : ''}
                <div class="user-profile" id="profileBtn" style="cursor:pointer; display:flex; align-items:center; gap:0.6rem; padding: 0.2rem 0.5rem; border-radius: 20px; transition: background 0.3s;">
                    <img src="${user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}`}" style="width:34px; height:34px; border-radius:50%; border:2px solid var(--accent-primary); object-fit: cover;">
                    <span style="font-size:0.95rem; font-weight:600; color:var(--text-primary);">${user.displayName || user.email.split('@')[0]}</span>
                </div>
            </div>
        `;
        
        // Hover effect for profile btn
        const pBtn = document.getElementById('profileBtn');
        if(pBtn) {
            pBtn.onmouseenter = () => pBtn.style.background = 'var(--bg-tertiary)';
            pBtn.onmouseleave = () => pBtn.style.background = 'none';
        }

        document.getElementById('profileBtn')?.addEventListener('click', () => {
            loadAuthorDashboard();
            toggleProfileModal(true);
        });
        document.getElementById('adminBtn')?.addEventListener('click', () => {
            loadStats();
            toggleAdminModal(true);
        });

        checkNotifications();
    } else {
        if (createPostContainer) createPostContainer.classList.add('hidden');
        authSection.innerHTML = `<button class="btn btn-primary" id="loginBtn">Entrar / Cadastrar</button>`;
        document.getElementById('loginBtn')?.addEventListener('click', () => toggleAuthModal(true));
    }
};

document.getElementById('profileImage')?.addEventListener('input', (e) => {
    document.getElementById('profilePreview').src = e.target.value || `https://ui-avatars.com/api/?name=${auth.currentUser?.displayName || 'User'}`;
});

loginBtn?.addEventListener('click', () => toggleAuthModal(true));
openCreatePostModalBtn?.addEventListener('click', () => {
    if(!auth.currentUser) {
        showToast("Faça login para criar artigos.", "error");
        toggleAuthModal(true);
        return;
    }
    document.getElementById('postModalTitle').textContent = "Criar Novo Artigo";
    document.getElementById('createPostForm').reset();
    document.getElementById('postIdInput').value = '';
    initQuill();
    if(window.quillInstance) window.quillInstance.setContents([]);
    if(window.updateLivePreview) window.updateLivePreview(); // Reset preview
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

// Search with Highlighting
searchInput?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allPosts.filter(p => 
        p.title.toLowerCase().includes(term) || 
        p.content.toLowerCase().includes(term)
    );
    renderMagazine(filtered, false);
    
    if(term.length > 2) {
        highlightSearchTerms(term);
    }
});

const highlightSearchTerms = (term) => {
    const cards = document.querySelectorAll('.post-title, .post-excerpt');
    cards.forEach(card => {
        const regex = new RegExp(`(${term})`, 'gi');
        card.innerHTML = card.innerText.replace(regex, '<mark class="highlight">$1</mark>');
    });
};

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

// Listeners para inputs de arquivo (UI feedback)
document.getElementById('postImageFile')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const fileName = file?.name || '';
    document.getElementById('postImageFileName').textContent = fileName ? `Selecionado: ${fileName}` : '';
    
    if(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const previewImg = document.getElementById('previewImg');
            if(previewImg) previewImg.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('profileImageFile')?.addEventListener('change', (e) => {
    const fileName = e.target.files[0]?.name || '';
    const nameEl = document.getElementById('profileImageFileName');
    if(nameEl) nameEl.textContent = fileName ? `Selecionado: ${fileName}` : '';
});

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

    // Feed Posts - Incluindo todos os posts (mesmo o do Hero) conforme solicitado
    const feedPosts = sortedPosts.slice(0, currentlyDisplayedCount);

    if(updateHero) postsGrid.innerHTML = ''; // Limpa skeletons apenas se for um carregamento completo
    
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
            <img src="${post.imageUrl}" alt="${post.title}" class="post-image" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=800'" style="cursor:pointer;" onclick="openReadModal('${post.id}')">
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
                document.getElementById('postModalTitle').textContent = "Editar Artigo";
                document.getElementById('postIdInput').value = post.id;
                document.getElementById('postTitle').value = post.title;
                document.getElementById('postCategory').value = post.category;
                document.getElementById('postTags').value = post.tags ? post.tags.join(', ') : '';
                document.getElementById('postImage').value = post.imageUrl;
                
                initQuill();
                if(window.quillInstance) window.quillInstance.root.innerHTML = post.content;
                if(window.updateLivePreview) window.updateLivePreview(); // Load preview with data
                postModal.classList.add('active');
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

    // Update Meta Tags for SEO
    updateMetaTags(post.title, post.content.substring(0, 160), post.imageUrl);

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

        // Report logic
        document.getElementById('reportBtn').onclick = () => {
            const reason = prompt("Por que você está denunciando este artigo?\n(Ex: Conteúdo ofensivo, Plágio, Erro técnico)");
            if (reason) {
                reportContent('post', postId, reason);
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
            <button class="btn-copy-link" onclick="copyToClipboard('${window.location.href}')" title="Copiar Link" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:1.2rem;"><i class="ph ph-link"></i></button>
        </div>
    `;

    window.copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            showToast("Link copiado para a área de transferência!", "success");
            const btn = document.querySelector('.btn-copy-link i');
            if(btn) {
                btn.className = 'ph ph-check';
                setTimeout(() => btn.className = 'ph ph-link', 2000);
            }
        });
    };

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
    
    // TTS (Ouça o Artigo)
    const readContent = document.getElementById('readContent');
    const ttsBtn = document.createElement('button');
    ttsBtn.className = 'btn btn-outline';
    ttsBtn.innerHTML = '<i class="ph ph-speaker-high"></i> Ouça o Artigo';
    ttsBtn.style.marginRight = 'auto';
    ttsBtn.onclick = () => {
        const utterance = new SpeechSynthesisUtterance(readContent.innerText);
        utterance.lang = 'pt-BR';
        if(window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            ttsBtn.innerHTML = '<i class="ph ph-speaker-high"></i> Ouça o Artigo';
        } else {
            window.speechSynthesis.speak(utterance);
            ttsBtn.innerHTML = '<i class="ph ph-stop-circle"></i> Parar Leitura';
            utterance.onend = () => ttsBtn.innerHTML = '<i class="ph ph-speaker-high"></i> Ouça o Artigo';
        }
    };
    
    const readActions = document.querySelector('.interaction-bar');
    if(readActions) {
        const oldTts = readActions.querySelector('.tts-btn-container');
        if(oldTts) oldTts.remove();
        const container = document.createElement('div');
        container.className = 'tts-btn-container';
        container.appendChild(ttsBtn);
        readActions.insertBefore(container, readActions.firstChild);
    }

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
let isSubmittingPost = false;
document.getElementById('createPostForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (isSubmittingPost) return;

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
    
    // Sync Quill before getting value
    const content = window.quillInstance ? window.quillInstance.root.innerHTML : document.getElementById('postContent').value;
    const isDraft = document.getElementById('postIsDraft').checked;
    const scheduledAt = document.getElementById('postSchedule').value;

    if (!content || content === '<p><br></p>' || content.trim() === '') {
        showToast("Por favor, escreva o conteúdo do artigo.", "error");
        return;
    }

    const postBtn = document.getElementById('submitPostBtn');
    isSubmittingPost = true;
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
                isDraft,
                scheduledAt: scheduledAt || null
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
                scheduledAt: scheduledAt || null,
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
        isSubmittingPost = false;
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
    
    let authorData = {
        username: "Usuário",
        photoURL: "https://ui-avatars.com/api/?name=Usuario",
        role: "Leitor"
    };

    // 1. Try to get data from allPosts (fallback)
    const postWithAuthor = allPosts.find(p => p.authorId === authorId);
    if(postWithAuthor) {
        authorData.username = postWithAuthor.authorName;
        authorData.photoURL = postWithAuthor.authorPhoto;
    }

    // 2. Try to Fetch User Info from Firestore (more accurate but might be restricted)
    try {
        const userDoc = await getDoc(doc(db, "users", authorId));
        if(userDoc.exists()) {
            const data = userDoc.data();
            authorData.username = data.username || authorData.username;
            authorData.photoURL = data.photoURL || authorData.photoURL;
            authorData.role = data.role || authorData.role;
        }
    } catch (error) {
        console.warn("Could not fetch user doc, using fallback info.");
    }

    // Update Header
    document.getElementById('pubAuthorImg').src = authorData.photoURL;
    document.getElementById('pubAuthorName').textContent = authorData.username;
    document.getElementById('pubAuthorRole').textContent = authorData.role;

    // 3. Get author posts (using local filter for speed and robustness)
    const posts = allPosts.filter(p => p.authorId === authorId);
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
    if(posts.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-secondary); padding:1rem;">Este autor ainda não publicou artigos.</p>';
    } else {
        posts.slice(0, 5).forEach(p => {
            list.innerHTML += `
                <div style="padding:0.8rem; border-bottom:1px solid var(--glass-border); cursor:pointer;" onclick="togglePublicProfileModal(false); openReadModal('${p.id}')">
                    <h4 style="font-size:0.9rem;">${p.title}</h4>
                    <span style="font-size:0.75rem; color:var(--accent-primary);">${p.category}</span>
                </div>
            `;
        });
    }
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

// Admin: Render Admin Reports
const renderAdminReports = async () => {
    console.log("Rendering Admin Reports - v3.0.0");
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
        const escapedReason = (r.reason || '').replace(/'/g, "\\'");
        list.innerHTML += `
            <div class="report-card" style="border: 1px solid var(--glass-border); padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem; background: rgba(255,255,255,0.03);">
                <div class="report-info">
                    <h4 style="color: var(--accent-primary); margin-bottom: 0.5rem;">Denúncia de ${r.type === 'post' ? 'Artigo' : 'Comentário'}</h4>
                    <p><strong>Motivo:</strong> ${r.reason}</p>
                    <p><strong>Por:</strong> ${r.reporterName} em ${d}</p>
                    <p style="font-size:0.7rem; margin-top:0.3rem; opacity: 0.5;">ID Alvo: ${r.targetId}</p>
                </div>
                <div class="report-actions" style="display:flex; gap:0.8rem; margin-top: 1rem;">
                    <button class="btn btn-sm btn-accent" onclick="window.respondToReport('${r.id}', '${r.reporterId}', '${escapedReason}')" style="background: var(--accent-primary) !important;">
                        <i class="ph ph-chat-centered-text"></i> Responder
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="window.ignoreReport('${r.id}', '${r.reporterId}', '${escapedReason}')">
                        <i class="ph ph-trash"></i> Ignorar
                    </button>
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
            renderAdminReports();
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
            renderAdminReports();
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

    // Load Favorites
    const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    const bookmarks = userDoc.exists() ? (userDoc.data().bookmarks || []) : [];
    const favoritePosts = allPosts.filter(p => bookmarks.includes(p.id));
    
    const favList = document.getElementById('favoritesList');
    favList.innerHTML = '';
    if(favoritePosts.length === 0) {
        favList.innerHTML = '<p style="color:var(--text-secondary); font-size:0.85rem;">Nenhum artigo favoritado.</p>';
    } else {
        favoritePosts.forEach(p => {
            favList.innerHTML += `
                <div style="padding:0.8rem; border:1px solid var(--glass-border); border-radius:8px; cursor:pointer; display:flex; justify-content:space-between; align-items:center;" onclick="toggleProfileModal(false); openReadModal('${p.id}')">
                    <div>
                        <h4 style="font-size:0.9rem;">${p.title}</h4>
                        <p style="font-size:0.75rem; color:var(--text-secondary);">${p.category}</p>
                    </div>
                    <i class="ph-fill ph-caret-right" style="color:var(--accent-primary);"></i>
                </div>
            `;
        });
    }
};

// Profile Tabs Switcher
document.querySelectorAll('.profile-tabs .tab').forEach(tab => {
    tab.onclick = () => {
        document.querySelectorAll('.profile-tabs .tab').forEach(t => {
            t.classList.remove('active');
            t.style.color = 'var(--text-secondary)';
        });
        tab.classList.add('active');
        tab.style.color = 'inherit';
        
        const target = tab.dataset.tab;
        if(target === 'stats') {
            document.getElementById('profileStatsView').style.display = 'block';
            document.getElementById('profileFavoritesView').style.display = 'none';
        } else {
            document.getElementById('profileStatsView').style.display = 'none';
            document.getElementById('profileFavoritesView').style.display = 'block';
        }
    };
});


const loadStats = async () => {
    let totalViews = 0;
    allPosts.forEach(p => totalViews += (p.views || 0));
    
    const viewsEl = document.getElementById('statTotalViews');
    const postsEl = document.getElementById('statTotalPosts');
    if(viewsEl) viewsEl.textContent = totalViews.toLocaleString();
    if(postsEl) postsEl.textContent = allPosts.length;

    // Simple Bar Chart
    const chart = document.getElementById('analyticsChart');
    if(chart) {
        chart.innerHTML = '';
        const categories = {};
        allPosts.forEach(p => categories[p.category] = (categories[p.category] || 0) + 1);
        
        Object.entries(categories).forEach(([name, count]) => {
            const height = (count / allPosts.length) * 100;
            chart.innerHTML += `
                <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:0.5rem; height:100%; justify-content:flex-end;">
                    <div style="width:20px; height:${height}%; background:var(--accent-primary); border-radius:4px 4px 0 0;" title="${name}: ${count}"></div>
                    <span style="font-size:0.6rem; color:var(--text-secondary); writing-mode:vertical-lr; text-orientation:mixed;">${name}</span>
                </div>
            `;
        });
    }
};

const loadReports = async () => {
    const list = document.getElementById('reportsList');
    if(!list) return;
    list.innerHTML = '<div class="loader"></div>';
    
    const reports = await fetchReports();
    list.innerHTML = '';
    
    if(reports.length === 0) {
        list.innerHTML = '<p style="color: var(--text-secondary);">Nenhuma denúncia no momento.</p>';
        return;
    }

    reports.forEach(r => {
        const post = allPosts.find(p => p.id === r.postId);
        list.innerHTML += `
            <div class="report-item" style="background:var(--bg-tertiary); padding:1rem; border-radius:8px; margin-bottom:1rem; border:1px solid var(--glass-border);">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <div>
                        <h4 style="color:#ef4444; font-size:0.85rem; text-transform:uppercase;">Motivo: ${r.reason}</h4>
                        <p style="font-size:0.9rem; margin:0.5rem 0;"><strong>Post:</strong> ${post ? post.title : 'Artigo não encontrado'}</p>
                        <span style="font-size:0.75rem; color:var(--text-secondary);">Denunciado em: ${r.createdAt ? new Date(r.createdAt.seconds*1000).toLocaleDateString() : 'Recentemente'}</span>
                    </div>
                    <div style="display:flex; gap:0.5rem;">
                        <button class="btn btn-outline" style="padding:0.4rem 0.8rem; font-size:0.75rem;" onclick="window.ignoreReportAction('${r.id}')">Ignorar</button>
                        <button class="btn btn-accent" style="padding:0.4rem 0.8rem; font-size:0.75rem; background:#ef4444;" onclick="window.deleteReportedPostAction('${r.id}', '${r.postId}')">Excluir Post</button>
                    </div>
                </div>
            </div>
        `;
    });
};

window.ignoreReportAction = async (id) => {
    const success = await ignoreReport(id);
    if(success) {
        showToast("Denúncia ignorada.");
        loadReports();
    }
};

window.deleteReportedPostAction = async (reportId, postId) => {
    if(confirm("Tem certeza que deseja excluir este artigo permanentemente?")) {
        const success = await deletePost(postId);
        if(success) {
            await ignoreReport(reportId);
            allPosts = allPosts.filter(p => p.id !== postId);
            renderMagazine(allPosts);
            loadReports();
            loadStats();
        }
    }
};

// Admin Tab Switching
document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-view').forEach(v => v.style.display = 'none');
        
        tab.classList.add('active');
        const target = tab.dataset.target;
        const view = document.getElementById(target);
        if(view) view.style.display = 'block';
        
        if(target === 'adminReports') loadReports();
        if(target === 'stats') loadStats();
    });
});

// Role Change Listener
document.getElementById('changeRoleForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('adminUserEmail').value;
    const role = document.getElementById('adminUserRole').value;
    const success = await changeUserRole(email, role);
    if(success) e.target.reset();
});

// Global close for Admin Modal
document.querySelector('#adminModal .close-modal')?.addEventListener('click', () => toggleAdminModal(false));
