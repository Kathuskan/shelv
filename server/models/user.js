const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    googleId: { type: String, unique: true, sparse: true },
    role: { type: String, default: 'user' },
    sellerStatus: { type: String, default: 'none' },
    
    // The backpack to hold saved book IDs
    savedBooks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
    
    // Profile Picture (Base64 String)
    profilePicture: { type: String, default: "" },
    
    // OTP Verification Fields
    verificationCode: { type: String, select: false },
    otpHash: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
    otpSentAt: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
    emailVerifiedAt: Date,
    resetHash: { type: String, select: false },
    resetExpiresAt: { type: Date, select: false },
    tokenVersion: { type: Number, default: 0 },
    deliveryAddress: { recipient:String, phone:String, line1:String, line2:String, city:String, district:String, postalCode:String, country:String, instructions:String },
    sellerPhone: { type: String }
    
}, { timestamps: true });

// THIS IS THE LINE THAT WAS LIKELY MISSING! 
// It turns the schema above into a fully functional Mongoose model with .findById() tools.
module.exports = mongoose.model('User', userSchema);
