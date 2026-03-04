const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true // No duplicate accounts
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        enum: ['user', 'seller', 'admin'], 
        default: 'user' // Everyone starts as a standard user
    },
    sellerStatus: { 
        type: String, 
        enum: ['none', 'pending', 'approved', 'restricted'], 
        default: 'none' 
    },
    sellerPhone: { type: String, default: "" },
    verificationCode: { type: String, default: "" },
    savedBooks: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Book' 
    }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);