const User = require('../models/user'); // Make sure this path points to your user model!

// Guard 1: Only Admins allowed
const isAdmin = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;
        const freshUser = await User.findById(userId);
        
        if (freshUser && freshUser.role === 'admin') {
            next();
        } else {
            res.status(403).json({ message: "Access Denied. Admin privileges required." });
        }
    } catch (err) {
        res.status(500).json({ message: "Server error verifying admin status." });
    }
};

// Guard 2: Only Approved Sellers allowed
const isApprovedSeller = async (req, res, next) => {
    try {
        const userId = req.user.id || req.user._id;
        
        // Go straight to the database for the absolute truth!
        const freshUser = await User.findById(userId);
        
        // We use freshUser.sellerStatus here! No more token typos!
        if (freshUser && (freshUser.role === 'admin' || (freshUser.role === 'seller' && freshUser.sellerStatus === 'approved'))) {
            next(); // Access Granted!
        } else {
            res.status(403).json({ message: "Access Denied. You must be an approved seller." });
        }
    } catch (err) {
        console.error("Middleware Error:", err);
        res.status(500).json({ message: "Server error verifying seller status." });
    }
};

module.exports = { isAdmin, isApprovedSeller };