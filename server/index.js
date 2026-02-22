const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Models
const Book = require('./models/book'); 
const User = require('./models/user'); // <--- ADD THIS LINE

// Middleware & Routes
const authMiddleware = require('./middleware/authMiddleware');
const { isAdmin, isApprovedSeller } = require('./middleware/roleMiddleware');
const authRoutes = require('./routes/auth'); 

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// 1. Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to Shelv MongoDB Cluster'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// 2. ROUTES
app.use('/api/auth', authRoutes);

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

app.listen(PORT, () => {
    console.log(`🚀 Shelv Server is running on http://localhost:${PORT}`);
});