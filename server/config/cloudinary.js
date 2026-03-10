const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'shelv_books', // Folder name in Cloudinary
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});

const upload = multer({ storage: storage });

// Add this to your existing server/config/cloudinary.js
const profileStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'shelv_profiles', // Separate folder for profile pics
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }] // Auto-crops to the user's face!
    },
});

const uploadProfile = multer({ storage: profileStorage });

module.exports = { cloudinary, upload, uploadProfile }; // Export the new one