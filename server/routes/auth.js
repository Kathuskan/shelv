const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/user'); // Ensure this path matches your file structure
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');

// 1. Start Google Login
// When the user clicks "Continue with Google", they hit this route.
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: 'http://localhost:5173/login' }),
    (req, res) => {
        const token = jwt.sign(
            { id: req.user._id, role: req.user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // 🌟 THE FIX: Remove profilePicture from this object
        const userObj = {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            sellerStatus: req.user.sellerStatus
        };

        const userData = encodeURIComponent(JSON.stringify(userObj));
        const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
        res.redirect(`${CLIENT_URL}/social-success?token=${token}&user=${userData}`);
    }
);

// 1. REGISTER ROUTE
router.post('/register', async (req, res) => {
    try {
        // We now extract 'applySeller' from the frontend request
        const { name, email, password, applySeller } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already in use" });
        }
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ message: "Password does not meet security requirements." });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // If applySeller is true, set status to 'pending', otherwise 'none'
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            sellerStatus: applySeller ? 'pending' : 'none'
        });

        await newUser.save();
        res.status(201).json({ message: "User registered successfully! Please log in." });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. LOGIN ROUTE
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find the user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Compare the plaintext password with the hashed password in the DB
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Generate the JWT (The digital ID card)
        const token = jwt.sign(
            { id: user._id, role: user.role, status: user.sellerStatus },
            process.env.JWT_SECRET,
            { expiresIn: '1d' } // Token expires in 1 day
        );

        // Send the token and user data back to the React frontend
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,              // <--- THIS IS CRITICAL
                sellerStatus: user.sellerStatus // <--- SO IS THIS
            }
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;