const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true },
    isbn: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    contactEmail: { type: String, required: true },
    contactPhone: { type: String, required: true },

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

    // --- 🌟 UPDATED PRICING LOGIC ---
    price: { type: Number, required: true }, // Used as Total Price OR Base Rent Price
    rentalPeriod: { type: Number },          // e.g., 7 (days)
    extraDayPrice: { type: Number },         // e.g., 50 (rupees per extra day)
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