const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Book = require("./models/Book");
const User = require("./models/user");
const Order = require("./models/Order");
const Review = require("./models/Review");
const auth = require("./middleware/authMiddleware");
const rateLimit = require("./lib/rateLimit");
const discoveryRouter = require("./routes/discovery");
const discovery = require("./services/discovery");
const v = require("./lib/validation");
const createOrders = require("./services/orders");
const createGateway = require("./services/gateway");
const sendEmail = require("./utils/sendEmail");
const { upload, uploadProfile } = require("./config/cloudinary");
const route = v.asyncRoute;
const userView = (u) => ({
  id: u.id,
  _id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  sellerStatus: u.sellerStatus,
  profilePicture: u.profilePicture,
  deliveryAddress: u.deliveryAddress,
  emailVerifiedAt: u.emailVerifiedAt,
});
const token = (u) =>
  jwt.sign({ id: u.id, version: u.tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: "7d",
    algorithm: "HS256",
  });
const seller = (req, res, next) =>
  createOrders.eligibleSeller(req.user)
    ? next()
    : res
        .status(403)
        .json({ message: "An approved seller account is required." });
const admin = (req, res, next) =>
  req.user.role === "admin"
    ? next()
    : res.status(403).json({ message: "Administrator access required." });
const email = (value) => {
  const out = v.text(value, "Email", 254).toLowerCase();
  v.assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out), "Enter a valid email.");
  return out;
};
const password = (value) => {
  v.assert(
    typeof value === "string" && value.length >= 10 && value.length <= 128,
    "Use a password of 10–128 characters."
  );
  return value;
};
function bookInput(body) {
  v.assert(
    !body.listingType || body.listingType === "Sale",
    "Only book sales are supported."
  );
  v.assert(["New", "Used"].includes(body.condition), "Choose new or used.");
  const out = {
    listingType: "Sale",
    condition: body.condition,
    price: v.money(body.price, "Price") / 100,
    deliveryFee: v.money(body.deliveryFee, "Delivery fee", true) / 100,
    stock: v.integer(body.stock, "Stock", 0, 10000),
  };
  for (const [key, max, required] of [
    ["title", 200, true],
    ["author", 160, true],
    ["category", 80, true],
    ["description", 5000, true],
    ["isbn", 30, false],
    ["language", 50, true],
    ["edition", 80, false],
    ["conditionNotes", 1000, false],
    ["dispatchFrom", 100, true],
  ])
    out[key] = v.text(body[key], key, max, required);
  if (body.status) {
    v.assert(
      ["active", "archived"].includes(body.status),
      "Invalid listing status."
    );
    out.status = body.status;
  }
  return out;
}
function createApp({ gateway = createGateway(), mail = sendEmail } = {}) {
  const app = express(),
    orders = createOrders(gateway);
  const googleEnabled =
    !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
  app.disable("x-powered-by");
  app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
  app.post(
    "/api/webhook",
    express.raw({ type: "application/json", limit: "256kb" }),
    route(async (req, res) => {
      v.assert(gateway.enabled, "Card payments are disabled.", 503);
      let event;
      try {
        event = gateway.verify(req.body, req.headers["stripe-signature"]);
      } catch {
        throw new v.HttpError(400, "Invalid payment signature.");
      }
      if (
        [
          "checkout.session.completed",
          "checkout.session.async_payment_succeeded",
        ].includes(event.type) &&
        event.data.object.payment_status === "paid"
      )
        await orders.applyPayment(event.data.object);
      res.json({ received: true });
    })
  );
  app.use(express.json({ limit: "64kb" }));
  app.use("/api/v1", discoveryRouter());
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/config", (_req, res) =>
    res.json({
      currency: "LKR",
      country: "LK",
      districts: v.districts,
      cardPayments: gateway.enabled,
      googleLogin: googleEnabled,
    })
  );
  const authLimit = rateLimit({ limit: 15, windowMs: 15 * 60 * 1000 });
  if (googleEnabled) {
    const passport = require("./config/passport")();
    app.use(passport.initialize());
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/auth/google",
      maxAge: 600000,
    };
    app.get("/api/auth/google", authLimit, (req, res, next) => {
      const state = jwt.sign(
        { nonce: crypto.randomBytes(24).toString("hex") },
        process.env.JWT_SECRET,
        { audience: "google-oauth", expiresIn: "10m" }
      );
      res.cookie("shelv_oauth", state, cookieOptions);
      passport.authenticate("google", {
        scope: ["profile", "email"],
        state,
        session: false,
      })(req, res, next);
    });
    app.get(
      "/api/auth/google/callback",
      (req, res, next) => {
        const cookie = req.headers.cookie
          ?.split(";")
          .map((p) => p.trim())
          .find((p) => p.startsWith("shelv_oauth="))
          ?.slice(12);
        try {
          v.assert(
            typeof req.query.state === "string" && cookie === req.query.state,
            "Invalid sign-in state.",
            400
          );
          jwt.verify(req.query.state, process.env.JWT_SECRET, {
            audience: "google-oauth",
            algorithms: ["HS256"],
          });
        } catch {
          return res.redirect(
            `${
              process.env.CLIENT_URL || "http://localhost:5173"
            }/login?error=google`
          );
        }
        res.clearCookie("shelv_oauth", { ...cookieOptions, maxAge: undefined });
        next();
      },
      passport.authenticate("google", {
        session: false,
        failureRedirect: `${
          process.env.CLIENT_URL || "http://localhost:5173"
        }/login?error=google`,
      }),
      (req, res) =>
        res.redirect(
          `${
            process.env.CLIENT_URL || "http://localhost:5173"
          }/social-success#token=${encodeURIComponent(token(req.user))}`
        )
    );
  }
  app.post(
    "/api/auth/register",
    authLimit,
    route(async (req, res) => {
      const name = v.text(req.body.name, "Name", 100),
        address = email(req.body.email),
        hash = await bcrypt.hash(password(req.body.password), 12);
      const user = await User.create({ name, email: address, password: hash });
      res.status(201).json({ token: token(user), user: userView(user) });
    })
  );
  app.post(
    "/api/auth/login",
    authLimit,
    route(async (req, res) => {
      const user = await User.findOne({ email: email(req.body.email) }).select(
        "+password"
      );
      v.assert(
        typeof req.body.password === "string" &&
          req.body.password.length <= 128,
        "Invalid email or password.",
        401
      );
      v.assert(
        user?.password &&
          (await bcrypt.compare(req.body.password, user.password)),
        "Invalid email or password.",
        401
      );
      res.json({ token: token(user), user: userView(user) });
    })
  );
  app.get(
    "/api/auth/me",
    auth,
    route(async (req, res) => res.json(userView(req.user)))
  );
  app.put(
    "/api/user/profile",
    auth,
    route(async (req, res) => {
      const changes = { name: v.text(req.body.name, "Name", 100) };
      if (req.body.deliveryAddress)
        changes.deliveryAddress = v.address(req.body.deliveryAddress);
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: changes },
        { new: true, runValidators: true }
      );
      res.json(userView(user));
    })
  );
  app.post(
    "/api/user/profile-photo",
    auth,
    uploadProfile.single("image"),
    route(async (req, res) => {
      v.assert(req.file, "Choose a JPG, PNG or WebP photo.");
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: { profilePicture: req.file.path } },
        { new: true }
      );
      res.json(userView(user));
    })
  );
  app.get(
    "/api/user/saved-books",
    auth,
    route(async (req, res) => {
      const books = await Book.find({
        _id: { $in: req.user.savedBooks },
        listingType: "Sale",
        status: { $ne: "archived" },
      }).populate("seller", "name role sellerStatus");
      res.json(books.filter((b) => createOrders.eligibleSeller(b.seller)));
    })
  );
  app.put(
    "/api/user/saved-books/:id",
    auth,
    route(async (req, res) => {
      const book = await Book.findOne({
        _id: v.id(req.params.id),
        listingType: "Sale",
        status: { $ne: "archived" },
      });
      v.assert(book, "Book not found.", 404);
      await User.updateOne(
        { _id: req.user.id },
        { $addToSet: { savedBooks: book._id } }
      );
      res.json({ saved: true });
    })
  );
  app.delete(
    "/api/user/saved-books/:id",
    auth,
    route(async (req, res) => {
      await discovery.removeBookmark(req.user.id, v.id(req.params.id));
      res.json({ saved: false });
    })
  );
  app.post(
    "/api/auth/send-otp",
    auth,
    rateLimit({ limit: 5, windowMs: 3600000 }),
    route(async (req, res) => {
      v.assert(
        !["restricted", "pending", "approved"].includes(req.user.sellerStatus),
        "Your seller application already has a decision or is under review.",
        409
      );
      const code = String(crypto.randomInt(100000, 1000000));
      const updated = await User.findOneAndUpdate(
        {
          _id: req.user.id,
          $or: [
            { otpSentAt: { $exists: false } },
            { otpSentAt: { $lt: new Date(Date.now() - 60000) } },
          ],
        },
        {
          $set: {
            otpHash: v.fingerprint(code),
            otpExpiresAt: new Date(Date.now() + 10 * 60000),
            otpSentAt: new Date(),
            otpAttempts: 0,
          },
        }
      );
      v.assert(
        updated,
        "Please wait a minute before requesting another code.",
        429
      );
      await mail(
        req.user.email,
        "Verify your Shelv seller application",
        `Your verification code is ${code}. It expires in 10 minutes.`
      );
      res.json({ message: "Verification code sent." });
    })
  );
  app.post(
    "/api/auth/verify-otp",
    auth,
    rateLimit({ limit: 10, windowMs: 3600000 }),
    route(async (req, res) => {
      const code = v.text(req.body.code, "Verification code", 6),
        phone = v.text(req.body.phone, "Seller phone", 20);
      v.assert(
        /^(0\d{9}|\+94\d{9})$/.test(phone),
        "Enter a valid Sri Lankan phone number."
      );
      const user = await User.findOneAndUpdate(
        {
          _id: req.user.id,
          sellerStatus: { $nin: ["restricted", "pending", "approved"] },
          otpExpiresAt: { $gt: new Date() },
          otpAttempts: { $lt: 5 },
        },
        { $inc: { otpAttempts: 1 } },
        { new: true }
      ).select("+otpHash");
      v.assert(
        user && user.otpHash === v.fingerprint(code),
        "Invalid or expired code. Request another code if necessary.",
        400
      );
      const applied = await User.findOneAndUpdate(
        {
          _id: user.id,
          otpHash: user.otpHash,
          sellerStatus: { $nin: ["restricted", "pending", "approved"] },
        },
        {
          $set: {
            emailVerifiedAt: new Date(),
            sellerStatus: "pending",
            sellerPhone: phone,
          },
          $unset: { otpHash: 1, otpExpiresAt: 1, verificationCode: 1 },
        },
        { new: true }
      );
      v.assert(applied, "Application already submitted.", 409);
      res.json(userView(applied));
    })
  );
  app.post(
    "/api/auth/forgot-password",
    authLimit,
    route(async (req, res) => {
      const user = await User.findOne({ email: email(req.body.email) });
      if (user) {
        const reset = crypto.randomBytes(32).toString("hex");
        await User.updateOne(
          { _id: user.id },
          {
            $set: {
              resetHash: v.fingerprint(reset),
              resetExpiresAt: new Date(Date.now() + 30 * 60000),
            },
          }
        );
        await mail(
          user.email,
          "Reset your Shelv password",
          `Reset your password: ${
            process.env.CLIENT_URL || "http://localhost:5173"
          }/reset-password?token=${reset}`
        );
      }
      res.json({
        message: "If this email has an account, a reset link has been sent.",
      });
    })
  );
  app.post(
    "/api/auth/reset-password",
    authLimit,
    route(async (req, res) => {
      const hash = await bcrypt.hash(password(req.body.password), 12),
        reset = v.text(req.body.token, "Reset token", 64);
      const user = await User.findOneAndUpdate(
        {
          resetHash: v.fingerprint(reset),
          resetExpiresAt: { $gt: new Date() },
        },
        {
          $set: { password: hash },
          $unset: { resetHash: 1, resetExpiresAt: 1 },
          $inc: { tokenVersion: 1 },
        }
      );
      v.assert(user, "This reset link is invalid or expired.", 400);
      res.json({ message: "Password updated. Please sign in." });
    })
  );
  app.get(
    "/api/books",
    route(async (req, res) => {
      const page = v.integer(req.query.page || 1, "Page", 1, 10000),
        filter = {
          listingType: "Sale",
          status: { $ne: "archived" },
          stock: { $gt: 0 },
        };
      filter.seller = {
        $in: await User.find({
          $or: [
            { role: "admin" },
            { role: "seller", sellerStatus: "approved" },
          ],
        }).distinct("_id"),
      };
      if (req.query.q) {
        const term = v
          .text(req.query.q, "Search", 100)
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.$or = [
          { title: { $regex: term, $options: "i" } },
          { author: { $regex: term, $options: "i" } },
        ];
      }
      if (["New", "Used"].includes(req.query.condition))
        filter.condition = req.query.condition;
      const [items, total] = await Promise.all([
        Book.find(filter)
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * 24)
          .limit(24)
          .populate("seller", "name"),
        Book.countDocuments(filter),
      ]);
      res.json({ items, total, page, pages: Math.ceil(total / 24) });
    })
  );
  app.get(
    "/api/books/:id",
    route(async (req, res) => {
      const book = await Book.findOne({
        _id: v.id(req.params.id),
        listingType: "Sale",
        status: { $ne: "archived" },
      }).populate("seller", "name role sellerStatus");
      v.assert(
        book && createOrders.eligibleSeller(book.seller),
        "Listing not found.",
        404
      );
      const reviews = await Review.find({ book: book.id })
        .select("name rating comment createdAt")
        .sort({ createdAt: -1 })
        .limit(30);
      res.json({ book, reviews });
    })
  );
  app.get(
    "/api/seller/books",
    auth,
    seller,
    route(async (req, res) =>
      res.json(
        await Book.find({ seller: req.user.id, listingType: "Sale" })
          .sort({ createdAt: -1 })
          .limit(500)
      )
    )
  );
  app.get(
    "/api/seller/books/:id",
    auth,
    seller,
    route(async (req, res) => {
      const book = await Book.findOne({
        _id: v.id(req.params.id),
        seller: req.user.id,
        listingType: "Sale",
      });
      v.assert(book, "Listing not found.", 404);
      res.json(book);
    })
  );
  app.post(
    "/api/books",
    auth,
    seller,
    upload.array("images", 5),
    route(async (req, res) => {
      const data = bookInput(req.body);
      v.assert(req.files?.length, "Add at least one book image.");
      const book = await Book.create({
        ...data,
        images: req.files.map((f) => f.path),
        seller: req.user.id,
      });
      res.status(201).json(book);
    })
  );
  app.put(
    "/api/books/:id",
    auth,
    seller,
    upload.array("images", 5),
    route(async (req, res) => {
      const changes = bookInput(req.body),
        version = v.integer(req.body.version, "Listing version", 0, 100000000);
      if (req.files?.length) changes.images = req.files.map((f) => f.path);
      const book = await Book.findOneAndUpdate(
        {
          _id: v.id(req.params.id),
          seller: req.user.id,
          __v: version,
          listingType: "Sale",
        },
        { $set: changes, $inc: { __v: 1 } },
        { new: true, runValidators: true }
      );
      v.assert(
        book,
        "This listing changed. Reload before editing stock or prices.",
        409
      );
      res.json(book);
    })
  );
  app.delete(
    "/api/books/:id",
    auth,
    seller,
    route(async (req, res) => {
      const book = await Book.findOneAndUpdate(
        { _id: v.id(req.params.id), seller: req.user.id },
        { $set: { status: "archived" }, $inc: { __v: 1 } },
        { new: true }
      );
      v.assert(book, "Listing not found.", 404);
      res.json(book);
    })
  );
  app.post(
    "/api/orders/quote",
    auth,
    route(async (req, res) => {
      const q = await orders.quote(
        req.body.bookId,
        v.integer(req.body.quantity, "Quantity", 1, 20)
      );
      res.json({
        unitPriceMinor: q.unitPriceMinor,
        subtotalMinor: q.subtotalMinor,
        deliveryMinor: q.deliveryMinor,
        totalMinor: q.totalMinor,
        currency: q.currency,
      });
    })
  );
  app.post(
    "/api/orders",
    auth,
    rateLimit({ limit: 20 }),
    route(async (req, res) =>
      res
        .status(201)
        .json(
          await orders.create(
            req.user,
            req.body,
            req.headers["idempotency-key"]
          )
        )
    )
  );
  app.get(
    "/api/orders",
    auth,
    route(async (req, res) => {
      const page = v.integer(req.query.page || 1, "Page", 1, 10000);
      const filter =
        req.query.view === "all" && req.user.role === "admin"
          ? {}
          : req.query.view === "seller"
          ? { seller: req.user.id }
          : { buyer: req.user.id };
      const [items, total] = await Promise.all([
        Order.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * 30)
          .limit(30),
        Order.countDocuments(filter),
      ]);
      res.json({ items, total, page, pages: Math.ceil(total / 30) });
    })
  );
  app.get(
    "/api/orders/:id",
    auth,
    route(async (req, res) => {
      let order = await orders.accessible(req.params.id, req.user);
      if (
        order.status === "awaiting_payment" &&
        order.expiresAt <= new Date()
      ) {
        await orders.expire(order.id);
        order = await orders.accessible(order.id, req.user);
      }
      res.json(order);
    })
  );
  app.post(
    "/api/orders/:id/pay",
    auth,
    rateLimit({ limit: 10 }),
    route(async (req, res) =>
      res.json(await orders.pay(req.params.id, req.user))
    )
  );
  app.post(
    "/api/orders/:id/actions",
    auth,
    route(async (req, res) =>
      res.json(await orders.transition(req.params.id, req.user, req.body))
    )
  );
  app.post(
    "/api/orders/:id/reviews",
    auth,
    route(async (req, res) =>
      res
        .status(201)
        .json(await orders.review(req.params.id, req.user, req.body))
    )
  );
  app.get(
    "/api/admin/users",
    auth,
    admin,
    route(async (_req, res) =>
      res.json(
        await User.find()
          .select("name email role sellerStatus emailVerifiedAt sellerPhone")
          .sort({ createdAt: -1 })
          .limit(500)
      )
    )
  );
  app.put(
    "/api/admin/users/:id",
    auth,
    admin,
    route(async (req, res) => {
      v.assert(
        ["approve", "restrict"].includes(req.body.action),
        "Invalid moderation action."
      );
      const filter = { _id: v.id(req.params.id), role: { $ne: "admin" } };
      if (req.body.action === "approve") {
        filter.emailVerifiedAt = { $ne: null };
        filter.sellerStatus = { $in: ["pending", "restricted"] };
      }
      const user = await User.findOneAndUpdate(
        filter,
        {
          $set: {
            role: "seller",
            sellerStatus:
              req.body.action === "approve" ? "approved" : "restricted",
          },
          $inc: { __v: 1 },
        },
        { new: true }
      );
      v.assert(user, "Seller not eligible for this action.", 409);
      res.json(userView(user));
    })
  );
  app.get(
    "/api/admin/books",
    auth,
    admin,
    route(async (_req, res) =>
      res.json(
        await Book.find({ listingType: "Sale" })
          .populate("seller", "name")
          .sort({ createdAt: -1 })
          .limit(500)
      )
    )
  );
  app.delete(
    "/api/admin/books/:id",
    auth,
    admin,
    route(async (req, res) => {
      await Book.updateOne(
        { _id: v.id(req.params.id) },
        { $set: { status: "archived" }, $inc: { __v: 1 } }
      );
      res.json({ message: "Listing archived." });
    })
  );
  app.use((_req, res) => res.status(404).json({ message: "Page not found." }));
  app.use((error, _req, res, _next) => {
    const status =
      error.status ||
      (error.code === 11000
        ? 409
        : ["ValidationError", "CastError", "MulterError"].includes(error.name)
        ? 422
        : 500);
    if (status === 500) console.error("Request failed:", error.message);
    res
      .status(status)
      .json({
        message:
          status === 500
            ? "Something went wrong. Please try again."
            : error.code === 11000
            ? "This record already exists."
            : error.message,
      });
  });
  app.locals.orders = orders;
  app.locals.mail = mail;
  return app;
}
module.exports = createApp;
