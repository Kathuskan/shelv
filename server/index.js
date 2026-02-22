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
app.get('/api/books', async (req, res) => {
    try {
        const books = await Book.find();
        res.status(200).json(books);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST ROUTE: Create a New Listing
app.post('/api/books', async (req, res) => {
    try {
        const newBook = new Book(req.body); 
        const savedBook = await newBook.save(); 
        res.status(201).json(savedBook); 
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 3. START SERVER (Always at the very bottom)
app.listen(PORT, () => {
    console.log(`🚀 Shelv Server is running on http://localhost:${PORT}`);
});