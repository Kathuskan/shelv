// Guard 1: Only Admins allowed
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next(); // Let them pass
    } else {
        res.status(403).json({ message: "Access Denied. Admin privileges required." });
    }
};

// Guard 2: Only Approved Sellers allowed
const isApprovedSeller = (req, res, next) => {
    // Check if they are a seller OR an admin (admins can usually do everything)
    if (req.user && (req.user.role === 'admin' || (req.user.role === 'seller' && req.user.status === 'approved'))) {
        next(); // Let them pass
    } else {
        res.status(403).json({ message: "Access Denied. You must be an approved seller to perform this action." });
    }
};



module.exports = { isAdmin, isApprovedSeller };