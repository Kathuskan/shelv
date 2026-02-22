// Guard 1: Only Admins allowed
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: "Access Denied. Admin privileges required." });
    }
};

// Guard 2: Only Approved Sellers allowed
const isApprovedSeller = (req, res, next) => {
    // Admins are allowed to post books too
    if (req.user && (req.user.role === 'admin' || (req.user.role === 'seller' && req.user.status === 'approved'))) {
        next();
    } else {
        res.status(403).json({ message: "Access Denied. You must be an approved seller." });
    }
};

module.exports = { isAdmin, isApprovedSeller };