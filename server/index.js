const authMiddleware = require('./middleware/authMiddleware');
const { isAdmin, isApprovedSeller } = require('./middleware/roleMiddleware');
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Book = require('./models/book'); 
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

// 2. ROUTES (Define these BEFORE app.listen)
// Auth Routes
app.use('/api/auth', authRoutes);

// Test Route
app.get('/api/test-book', (req, res) => {
    res.json({ title: "MERN for Data Science", status: "Connected to DB!" });
});

// GET ROUTE: Fetch all books
app.get('/api/books' , async (req, res) => {
    try {
        const books = await Book.find();
        res.status(200).json(books);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST ROUTE: Create a New Listing
// POST ROUTE: Add a new book (PROTECTED BY AUTH MIDDLEWARE)
app.post('/api/books', authMiddleware, isApprovedSeller, async (req, res) => {
    try {
        // We now extract the data from the frontend, PLUS we automatically 
        // add the seller ID from the verified token!
        const newBook = new Book({
            ...req.body,
            seller: req.user.id // This comes directly from our Bouncer!
        });
        
        await newBook.save();
        res.status(201).json(newBook);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Shelv Server is running on http://localhost:${PORT}`);
});