const jwt = require("jsonwebtoken");
const User = require("../models/user");
module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return res.status(401).json({ message: "Please sign in." });
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    const user = await User.findById(payload.id);
    if (!user || (payload.version || 0) !== user.tokenVersion)
      return res.status(401).json({ message: "Please sign in again." });
    req.user = user;
    next();
  } catch (error) {
    if (
      [
        "JsonWebTokenError",
        "TokenExpiredError",
        "NotBeforeError",
        "CastError",
      ].includes(error.name)
    )
      return res.status(401).json({ message: "Please sign in again." });
    next(error);
  }
};
