const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true },
    isbn: { type: String, default: '', trim: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    contactEmail: { type: String, select: false },
    contactPhone: { type: String, select: false },
    stock: { type: Number, min: 0, default: 1 },
    deliveryFee: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: ['active','archived'], default: 'active' },
    language: { type: String, default: 'English' },
    edition: { type: String, default: '' },
    conditionNotes: { type: String, default: '' },
    dispatchFrom: { type: String, default: '' },

    listingType: {
        type: String,
        required: true,
        enum: ['Sale'],
        default: 'Sale'
    },

    condition: {
        type: String,
        required: true,
        enum: ['New', 'Used'],
        default: 'New'
    },

    // --- 🌟 UPDATED PRICING LOGIC ---
    price: { type: Number, required: true, min: 1 },
    // --------------------------------

    // The single, consolidated user reference
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true // Now enforced! Every book MUST have a verified seller.
    },
    images: [{
        type: String,
        required: true
    }],
}, { timestamps: true });

const Book = mongoose.model('Book', bookSchema);
module.exports = Book;
