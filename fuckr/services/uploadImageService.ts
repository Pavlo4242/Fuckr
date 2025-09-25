import axios from 'axios';

// A helper function to get image dimensions from a file object
const getImageDimensions = (file: File): Promise<{ width: number, height: number }> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            resolve({ width: img.width, height: img.height });
            URL.revokeObjectURL(img.src); // Clean up object URL
        };
    });
};

const uploadImage = async (file: File, getUrl: (width: number, height: number) => string): Promise<string> => {
    const { width, height } = await getImageDimensions(file);
    const url = getUrl(width, height);

    const response = await axios.post(url, file, {
        headers: { 'Content-Type': file.type },
    });

    return response.data.mediaHash;
};

export const uploadImageService = {
    uploadChatImage: (file: File): Promise<string> => {
        return uploadImage(file, (width, height) => 
            `https://neo-upload.grindr.com/2.0/chatImage/${height},0,${width},0`
        );
    },

    uploadProfileImage: (file: File): Promise<string> => {
        return uploadImage(file, (width, height) => {
            const squareSize = Math.min(width, height);
            return `https://neo-upload.grindr.com/2.0/profileImage/${height},0,${width},0/${squareSize},0,${squareSize},0`;
        });
    },
};
