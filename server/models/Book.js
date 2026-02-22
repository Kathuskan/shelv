const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true },
    isbn: { type: String, unique: true, required: true },

    listingType: {
        type: String,
        required: true,
        enum: ['Rent', 'Sale'],
        default: 'Sale'
    },

    condition: {
        type: String,
        required: true,
        enum: ['New', 'Used'],
        default: 'New'
    },

    price: { type: Number, required: true, min: 0 },
    rentalDurationDays: { type: Number, default: 0 },

    // The single, consolidated user reference
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true // Now enforced! Every book MUST have a verified seller.
    }
}, { timestamps: true });

const Book = mongoose.model('Book', bookSchema);
module.exports = Book;