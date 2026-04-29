import { fetchPosts } from "./db.js";
import { logoutUser } from "./auth.js";

// DOM Elements
const authModal = document.getElementById('authModal');
const postModal = document.getElementById('postModal');
const loginBtn = document.getElementById('loginBtn');
const openCreatePostModalBtn = document.getElementById('openCreatePostModal');
const closeButtons = document.querySelectorAll('.close-modal, .close-modal-btn');
const authTabs = document.querySelectorAll('.auth-tabs .tab');
const authForms = document.querySelectorAll('.auth-form');
const navLinks = document.querySelectorAll('.nav-links a');
const authSection = document.getElementById('authSection');
const createPostContainer = document.getElementById('createPostContainer');
const postsGrid = document.getElementById('postsGrid');

let allPosts = []; // Local cache for filtering

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // Initial fetch
    allPosts = await fetchPosts();
});

// --- Modal Handling ---
export const toggleAuthModal = (show) => {
    if (show) {
        authModal.classList.add('active');
    } else {
        authModal.classList.remove('active');
    }
};

export const togglePostModal = (show) => {
    if (show) {
        postModal.classList.add('active');
    } else {
        postModal.classList.remove('active');
    }
};

loginBtn?.addEventListener('click', () => toggleAuthModal(true));
openCreatePostModalBtn?.addEventListener('click', () => togglePostModal(true));

closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        toggleAuthModal(false);
        togglePostModal(false);
    });
});

// Close modal on outside click
window.addEventListener('click', (e) => {
    if (e.target === authModal) toggleAuthModal(false);
    if (e.target === postModal) togglePostModal(false);
});

// --- Auth Tabs Handling ---
authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all
        authTabs.forEach(t => t.classList.remove('active'));
        authForms.forEach(f => f.classList.remove('active'));
        
        // Add to clicked
        tab.classList.add('active');
        const targetFormId = tab.dataset.tab === 'login' ? 'loginForm' : 'registerForm';
        document.getElementById(targetFormId).classList.add('active');
    });
});

// --- Category Filtering ---
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        const category = link.dataset.category;
        filterPosts(category);
    });
});

const filterPosts = (category) => {
    if (category === 'all') {
        renderPosts(allPosts);
    } else {
        const filtered = allPosts.filter(post => post.category === category);
        renderPosts(filtered);
    }
};

// --- UI Updates based on Auth State ---
export const updateNavbarForUser = (user) => {
    if (user) {
        // User is logged in
        createPostContainer.classList.remove('hidden');
        
        const userName = user.displayName || user.email.split('@')[0];
        const userPhoto = user.photoURL || `https://ui-avatars.com/api/?name=${userName}&background=6366f1&color=fff`;

        authSection.innerHTML = `
            <div class="user-profile">
                <img src="${userPhoto}" alt="${userName}" title="${user.email}">
                <span class="user-name">${userName}</span>
            </div>
            <button class="btn btn-outline" id="logoutBtn">Sair</button>
        `;

        document.getElementById('logoutBtn').addEventListener('click', () => {
            logoutUser();
        });

    } else {
        // User is logged out
        createPostContainer.classList.add('hidden');
        authSection.innerHTML = `
            <button class="btn btn-primary" id="loginBtn">Entrar</button>
        `;
        document.getElementById('loginBtn').addEventListener('click', () => toggleAuthModal(true));
    }
};

// --- Render Posts ---
export const renderPosts = (posts) => {
    postsGrid.innerHTML = ''; // Clear loader
    
    if (posts.length === 0) {
        postsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                <i class="ph ph-article" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                <p>Nenhum artigo encontrado nesta categoria.</p>
            </div>
        `;
        return;
    }

    posts.forEach(post => {
        const dateStr = post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : 'Postado agora';
        
        const postEl = document.createElement('article');
        postEl.className = 'post-card';
        postEl.innerHTML = `
            <img src="${post.imageUrl}" alt="${post.title}" class="post-image" onerror="this.src='https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=800'">
            <div class="post-content">
                <div class="post-meta">
                    <span class="post-category">${post.category}</span>
                    <span class="post-date">${dateStr}</span>
                </div>
                <h3 class="post-title">${post.title}</h3>
                <p class="post-excerpt">${post.content}</p>
                
                <div class="post-author">
                    <img src="${post.authorPhoto}" alt="${post.authorName}" onerror="this.src='https://ui-avatars.com/api/?name=${post.authorName}'">
                    <span>${post.authorName}</span>
                </div>
            </div>
        `;
        postsGrid.appendChild(postEl);
    });
};

// --- Toast Notification ---
export const showToast = (message, type = 'success') => {
    const toast = document.getElementById('toast');
    
    const icon = type === 'success' ? '<i class="ph-fill ph-check-circle" style="color: #10b981;"></i>' : '<i class="ph-fill ph-warning-circle" style="color: #ef4444;"></i>';
    
    toast.innerHTML = `${icon} <span>${message}</span>`;
    toast.className = `toast show ${type}`;
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
};
