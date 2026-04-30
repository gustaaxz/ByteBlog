const IMGBB_API_KEY = '94e0c602be7bf97c3b73a15207df2ae1';

export const uploadImage = async (file) => {
    try {
        // Optimize image before upload
        const optimizedFile = await optimizeImage(file);
        
        const formData = new FormData();
        formData.append('image', optimizedFile);

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            return data.data.url;
        } else {
            throw new Error(data.error.message);
        }
    } catch (error) {
        console.error("Error uploading image to ImgBB:", error);
        throw error;
    }
};

const optimizeImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, { type: 'image/webp' }));
                }, 'image/webp', 0.8);
            };
        };
    });
};

export const showToast = (message, type = 'success') => {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const icon = type === 'success' ? '<i class="ph-fill ph-check-circle" style="color: #10b981;"></i>' : '<i class="ph-fill ph-warning-circle" style="color: #ef4444;"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 3000);
};
