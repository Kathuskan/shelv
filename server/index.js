require('dotenv').config(); // 1. Load the .env file (like loading a config file)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Book = require('./models/book'); // Import the Book model

const app = express();
const PORT = process.env.PORT || 5001; // Use the port from .env or 5001

// Middleware
app.use(cors());
app.use(express.json());

// 2. Connect to MongoDB (The Data Science "Source")
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to Shelv MongoDB Cluster'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Test Route
app.get('/api/test-book', (req, res) => {
    res.json({ title: "MERN for Data Science", status: "Connected to DB!" });
});

app.listen(PORT, () => {
    console.log(`🚀 Shelv Server is running on http://localhost:${PORT}`);
});


// ROUTE: Create a New Listing
app.post('/api/books', async (req, res) => {
    try {
        // req.body contains the data sent from Postman/Frontend
        const newBook = new Book(req.body); 
        
        // Save to MongoDB
        const savedBook = await newBook.save(); 
        
        res.status(201).json(savedBook); // 201 = Created
    } catch (err) {
        res.status(400).json({ message: err.message }); // 400 = Bad Request
    }
});