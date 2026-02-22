const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // 1. Look for the token in the headers
    const token = req.header('Authorization');

    // 2. If there is no token, reject the request
    if (!token) {
        return res.status(401).json({ message: "Access Denied. No token provided." });
    }

    try {
        // 3. The token usually comes in as "Bearer <token>". Let's split it to get just the token part.
        const actualToken = token.split(" ")[1];

        // 4. Verify the token using your secret key
        const verifiedUser = jwt.verify(actualToken, process.env.JWT_SECRET);
        
        // 5. Attach the decoded user payload to the request so the next function can use it
        req.user = verifiedUser;
        
        // 6. Let the request pass through to the main route!
        next();
    } catch (err) {
        res.status(400).json({ message: "Invalid Token." });
    }
};

module.exports = authMiddleware;