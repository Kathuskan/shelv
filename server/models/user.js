const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    sellerStatus: { type: String, default: 'none' },
    
    // The backpack to hold saved book IDs
    savedBooks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
    
    // Profile Picture (Base64 String)
    profilePicture: { type: String, default: "" },
    
    // OTP Verification Fields
    verificationCode: { type: String },
    sellerPhone: { type: String }
    
}, { timestamps: true });

// THIS IS THE LINE THAT WAS LIKELY MISSING! 
// It turns the schema above into a fully functional Mongoose model with .findById() tools.
module.exports = mongoose.model('User', userSchema);