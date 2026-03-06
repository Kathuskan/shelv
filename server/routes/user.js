const express = require('express');
const router = express.Router();
const User = require('../models/user'); 
const authMiddleware = require('../middleware/authMiddleware'); 

// 1. POST: Toggle Save/Unsave Book
router.post('/save-book', authMiddleware, async (req, res) => {
    try {
        const { bookId } = req.body;
        const userId = req.user.id || req.user._id; 
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ message: "User not found" });

        const isSaved = user.savedBooks.includes(bookId);

        if (isSaved) {
            user.savedBooks = user.savedBooks.filter(id => id.toString() !== bookId);
        } else {
            user.savedBooks.push(bookId);
        }

        await user.save();
        res.status(200).json({ message: "Success!", savedBooks: user.savedBooks });
    } catch (err) {
        console.error("Save Book Error:", err);
        res.status(500).json({ message: "Server error saving book." });
    }
});

// 2. GET: Fetch Saved Books for Profile Page
router.get('/saved-books', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id; 
        const user = await User.findById(userId).populate('savedBooks');
        
        if (!user) return res.status(404).json({ message: "User not found" });

        res.status(200).json(user.savedBooks);
    } catch (err) {
        console.error("Fetch Saved Books Error:", err);
        res.status(500).json({ message: "Server error fetching saved books." });
    }
});

// 3. PUT: Edit User Profile
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        
        // Notice we REMOVED email from here so the backend ignores it!
        const { name, profilePicture } = req.body;

        // 🌟 The Bulletproof Method: Find the user first, then save them.
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Update only the allowed fields
        if (name) user.name = name;
        if (profilePicture !== undefined) user.profilePicture = profilePicture;

        await user.save(); // Saves securely to the database

        // Convert to a normal object and delete the password so we don't send it to the frontend!
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(200).json(userResponse);
    } catch (err) {
        console.error("Edit Profile Error:", err);
        res.status(500).json({ message: "Server error updating profile." });
    }
});
module.exports = router;