// Process-local protection; use a shared limiter when running multiple API instances.
module.exports = function rateLimit({
  limit: max = 30,
  windowMs = 60000,
} = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    if (hits.size > 10000)
      for (const [key, bucket] of hits)
        if (bucket.until <= now) hits.delete(key);
    const key = req.user?.id || req.ip;
    const entry = hits.get(key);
    const bucket =
      entry && entry.until > now ? entry : { count: 0, until: now + windowMs };
    hits.set(key, bucket);
    if (++bucket.count > max) {
      res.set("Retry-After", String(Math.ceil((bucket.until - now) / 1000)));
      return res
        .status(429)
        .json({ message: "Too many requests. Please try again shortly." });
    }
    next();
  };
};
