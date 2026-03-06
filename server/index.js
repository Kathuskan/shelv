const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');

// Models
const Book = require('./models/book'); 
const User = require('./models/user'); 

// Middleware & Routes
const authMiddleware = require('./middleware/authMiddleware');
const { isAdmin, isApprovedSeller } = require('./middleware/roleMiddleware');
const authRoutes = require('./routes/auth'); 

const app = express();
const PORT = process.env.PORT || 5001;

// --- 🌟 1. MIDDLEWARE (MUST GO FIRST) 🌟 ---
app.use(cors());
// Increase the limit to 50 megabytes so it can accept image strings
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// --- 🌟 2. ROUTES (MUST GO AFTER MIDDLEWARE) 🌟 ---
app.use('/api/user', require('./routes/user'));
app.use('/api/auth', authRoutes);

// 3. Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to Shelv MongoDB Cluster'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));


// GET ROUTE: Fetch all books
app.get('/api/books' , async (req, res) => {
    try {
        const books = await Book.find();
        res.status(200).json(books);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST ROUTE: Add a new book (Must be Approved Seller)
app.post('/api/books', authMiddleware, isApprovedSeller, async (req, res) => {
    try {
        const newBook = new Book({
            ...req.body,
            seller: req.user.id 
        });
        await newBook.save();
        res.status(201).json(newBook);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE ROUTE: Only Admins can delete
app.delete('/api/books/:id', authMiddleware, isAdmin, async (req, res) => {
    try {
        await Book.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Book deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ADMIN: Fetch all pending sellers
app.get('/api/admin/pending-sellers', authMiddleware, isAdmin, async (req, res) => {
    try {
        const pendingUsers = await User.find({ sellerStatus: 'pending' });
        res.json(pendingUsers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ADMIN: Approve a seller
app.put('/api/admin/approve-seller/:id', authMiddleware, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).send("User not found");

        user.role = 'seller';
        user.sellerStatus = 'approved';
        await user.save();
        res.send("User approved as seller.");
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ADMIN: Reject a pending seller request
app.put('/api/admin/reject-seller/:id', authMiddleware, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).send("User not found");

        user.sellerStatus = 'none'; // Send them back to square one
        await user.save();
        res.json({ message: "Seller request rejected." });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ADMIN: Fetch ALL users for the master table
app.get('/api/admin/users', authMiddleware, isAdmin, async (req, res) => {
    try {
        // Find everyone except other admins (to prevent accidentally banning yourself!)
        const users = await User.find({ role: { $ne: 'admin' } }).select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ADMIN: Restrict/Ban a user from selling
app.put('/api/admin/restrict-user/:id', authMiddleware, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).send("User not found");

        user.role = 'user'; // Strip their seller role
        user.sellerStatus = 'restricted'; // Mark them as restricted
        await user.save();
        res.json({ message: "User has been restricted." });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT ROUTE: User requests to become a seller
app.put('/api/auth/request-seller', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        user.sellerStatus = 'pending';
        await user.save();
        res.status(200).json({ message: "Request sent successfully!" });
    } catch (err) {
        console.error("Seller Request Error:", err);
        res.status(500).json({ message: "Server error while processing request." });
    }
});

// SELLER ROUTE: Fetch only the logged-in seller's books
app.get('/api/seller/books', authMiddleware, isApprovedSeller, async (req, res) => {
    try {
        const books = await Book.find({ seller: req.user.id });
        res.status(200).json(books);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// SELLER ROUTE: Seller deletes their own book
app.delete('/api/seller/books/:id', authMiddleware, isApprovedSeller, async (req, res) => {
    try {
        const book = await Book.findOne({ _id: req.params.id, seller: req.user.id });
        if (!book) return res.status(404).json({ message: "Book not found or unauthorized" });

        await Book.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Your listing was deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// SELLER ROUTE: Edit their own book
app.put('/api/seller/books/:id', authMiddleware, isApprovedSeller, async (req, res) => {
    try {
        const updatedBook = await Book.findOneAndUpdate(
            { _id: req.params.id, seller: req.user.id },
            req.body, 
            { new: true } 
        );

        if (!updatedBook) {
            return res.status(404).json({ message: "Book not found or unauthorized to edit." });
        }

        res.status(200).json(updatedBook);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUBLIC ROUTE: Fetch a single book by its ID
app.get('/api/books/:id', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ message: "Book not found" });
        
        res.status(200).json(book);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// VERIFY OTP AND UPGRADE ACCOUNT
app.post('/api/auth/verify-otp', authMiddleware, async (req, res) => {
    try {
        const { code } = req.body;
        const user = await User.findById(req.user.id);

        if (user.verificationCode === code && code !== "") {
            user.role = 'seller';
            user.sellerStatus = 'approved';
            user.verificationCode = ""; 
            await user.save();

            const newToken = jwt.sign(
                { id: user._id, role: user.role, sellerStatus: user.sellerStatus }, 
                process.env.JWT_SECRET, 
                { expiresIn: '1d' }
            );

            res.status(200).json({ 
                message: "Verification successful! You are now a seller.",
                token: newToken, 
                updatedUser: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    sellerStatus: user.sellerStatus
                }
            });
        } else {
            res.status(400).json({ message: "Invalid verification code. Please try again." });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GENERATE AND SEND OTP
app.post('/api/auth/send-otp', authMiddleware, async (req, res) => {
    try {
        const { phone } = req.body;
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
        const userId = req.user.id || req.user._id;

        const user = await User.findByIdAndUpdate(userId, { 
            verificationCode: otp,
            sellerPhone: phone 
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        console.log(`\n📱 SMS TO ${phone}: Your Shelv Seller Verification Code is: ${otp}\n`);
        res.status(200).json({ message: "Verification code sent!" });
    } catch (err) {
        console.error("❌ CRITICAL OTP ERROR:", err);
        res.status(500).json({ message: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Shelv Server is running on http://localhost:${PORT}`);
});