const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true },
    isbn: { type: String, unique: true, required: true },
    
    // NEW: Categorical Data (Listing Type)
    listingType: {
        type: String,
        required: true,
        enum: ['Rent', 'Sale'], // Limits options to these two
        default: 'Sale'
    },

    // NEW: Condition of the book
    condition: {
        type: String,
        required: true,
        enum: ['New', 'Used'], 
        default: 'New'
    },

    price: { type: Number, required: true, min: 0 },
    
    // NEW: Rental-specific field (only needed if listingType is 'Rent')
    rentalDurationDays: { type: Number, default: 0 }, 
    
    sellerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', // We will build the User model later
        required: false // Temporary false until we have Auth
    }
}, { timestamps: true });

const Book = mongoose.model('Book', bookSchema);
module.exports = Book;