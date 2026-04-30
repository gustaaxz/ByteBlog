const IMGBB_API_KEY = '94e0c602be7bf97c3b73a15207df2ae1';

export const uploadImage = async (file) => {
    try {
        const formData = new FormData();
        formData.append('image', file);

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
