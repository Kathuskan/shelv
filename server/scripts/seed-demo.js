// Add isolated demo identities/listings; never reset existing accounts or stock.
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const User = require("../models/user");
const Book = require("../models/Book");
const credentialPath = path.join(__dirname, "../.demo-credentials.json");
const objectId = (value) =>
  new mongoose.Types.ObjectId(
    crypto
      .createHash("sha256")
      .update(`shelv-demo-v1:${value}`)
      .digest("hex")
      .slice(0, 24)
  );
const accounts = [
  {
    email: "demo.admin@shelv.example",
    name: "Demo Administrator",
    role: "admin",
    sellerStatus: "none",
  },
  {
    email: "demo.seller@shelv.example",
    name: "Colombo Demo Books",
    role: "seller",
    sellerStatus: "approved",
    sellerPhone: "0770000001",
  },
  {
    email: "demo.seller2@shelv.example",
    name: "Kandy Demo Books",
    role: "seller",
    sellerStatus: "approved",
    sellerPhone: "0770000002",
  },
  {
    email: "demo.buyer@shelv.example",
    name: "Demo Reader",
    role: "user",
    sellerStatus: "none",
  },
  {
    email: "demo.pending@shelv.example",
    name: "Demo Seller Applicant",
    role: "user",
    sellerStatus: "pending",
    sellerPhone: "0770000003",
  },
];
const catalogue = [
  [
    "secret-garden",
    "The Secret Garden",
    "Frances Hodgson Burnett",
    "Fiction",
    "Used",
    1200,
    4,
    250,
  ],
  [
    "pride-and-prejudice",
    "Pride and Prejudice",
    "Jane Austen",
    "Romance",
    "New",
    1800,
    6,
    300,
  ],
  [
    "room-of-ones-own",
    "A Room of One’s Own",
    "Virginia Woolf",
    "Essays",
    "Used",
    1450,
    3,
    250,
  ],
  [
    "sherlock-holmes",
    "The Adventures of Sherlock Holmes",
    "Arthur Conan Doyle",
    "Mystery & Thriller",
    "New",
    2100,
    5,
    300,
  ],
  [
    "time-machine",
    "The Time Machine",
    "H. G. Wells",
    "Science Fiction",
    "Used",
    950,
    2,
    200,
  ],
  [
    "alice-in-wonderland",
    "Alice’s Adventures in Wonderland",
    "Lewis Carroll",
    "Children’s Books",
    "New",
    1650,
    7,
    300,
  ],
  [
    "jungle-book",
    "The Jungle Book",
    "Rudyard Kipling",
    "Children’s Books",
    "Used",
    1100,
    3,
    250,
  ],
  [
    "jane-eyre",
    "Jane Eyre",
    "Charlotte Brontë",
    "Fiction",
    "New",
    2300,
    4,
    350,
  ],
  ["art-of-war", "The Art of War", "Sun Tzu", "History", "Used", 850, 1, 200],
  [
    "tale-of-two-cities",
    "A Tale of Two Cities",
    "Charles Dickens",
    "Historical Fiction",
    "New",
    1950,
    5,
    300,
  ],
];
async function main() {
  if (!process.env.MONGO_URI)
    throw new Error("Set MONGO_URI in server/.env first.");
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGO_URI, {
    autoIndex: false,
    autoCreate: false,
    serverSelectionTimeoutMS: 15000,
  });
  try {
    const connectionFingerprint = crypto
      .createHash("sha256")
      .update(process.env.MONGO_URI)
      .digest("hex");
    let credentials = fs.existsSync(credentialPath)
      ? JSON.parse(fs.readFileSync(credentialPath, "utf8"))
      : null;
    if (
      credentials &&
      credentials.connectionFingerprint !== connectionFingerprint
    )
      throw new Error(
        "The saved demo credentials belong to another database connection. Preserve that file before seeding a different connection."
      );
    const users = [];
    for (const account of accounts) {
      const existing = await User.findOne({ email: account.email }).select(
        "+password"
      );
      if (existing && String(existing._id) !== String(objectId(account.email)))
        throw new Error(
          `The email ${account.email} already belongs to another account; it will not be changed.`
        );
      users.push({ account, existing });
    }
    const existingBooks = await Book.countDocuments({
      _id: { $in: catalogue.map(([slug]) => objectId(`book:${slug}`)) },
    });
    console.log(
      JSON.stringify({
        database: mongoose.connection.name,
        collection: "users",
        mode: apply ? "apply" : "dry run",
        usersToAdd: users.filter((u) => !u.existing).length,
        booksToAdd: catalogue.length - existingBooks,
      })
    );
    if (!apply) return;
    if (!credentials) {
      if (users.some((u) => u.existing))
        throw new Error(
          "Demo accounts already exist but their saved password file is missing. Existing passwords will not be reset."
        );
      credentials = {
        database: mongoose.connection.name,
        connectionFingerprint,
        password: `ShelvDemo-${crypto.randomBytes(18).toString("base64url")}!`,
        accounts: accounts.map(({ email, role, sellerStatus }) => ({
          email,
          role,
          sellerStatus,
        })),
      };
      fs.writeFileSync(
        credentialPath,
        JSON.stringify(credentials, null, 2) + "\n",
        { mode: 0o600, flag: "wx" }
      );
    }
    for (const { account, existing } of users) {
      if (existing) {
        if (
          !existing.password ||
          !(await bcrypt.compare(credentials.password, existing.password))
        )
          throw new Error(
            `Password for ${account.email} has changed; existing credentials will not be overwritten.`
          );
        continue;
      }
      const deliveryAddress =
        account.email === "demo.buyer@shelv.example"
          ? {
              recipient: account.name,
              phone: "0770000004",
              line1: "12 Demo Lane",
              line2: "Fictional test address",
              city: "Colombo",
              district: "Colombo",
              postalCode: "00100",
              country: "LK",
              instructions: "Demo address — use for testing only.",
            }
          : undefined;
      await User.create({
        ...account,
        _id: objectId(account.email),
        password: await bcrypt.hash(credentials.password, 12),
        emailVerifiedAt: new Date(),
        deliveryAddress,
      });
    }
    for (let index = 0; index < catalogue.length; index++) {
      const [
        slug,
        title,
        author,
        category,
        condition,
        price,
        stock,
        deliveryFee,
      ] = catalogue[index];
      const sellerEmail =
        index % 2 ? "demo.seller2@shelv.example" : "demo.seller@shelv.example";
      await Book.updateOne(
        { _id: objectId(`book:${slug}`) },
        {
          $setOnInsert: {
            title,
            author,
            category,
            condition,
            price,
            stock,
            deliveryFee,
            listingType: "Sale",
            status: "active",
            language: "English",
            edition: "Demo edition",
            dispatchFrom: index % 2 ? "Kandy" : "Colombo",
            description: `Demo listing of ${title} by ${author}. Sample inventory for testing browsing, checkout and seller dispatch.`,
            conditionNotes:
              condition === "Used"
                ? "Demo condition: light cover wear; all pages present."
                : "Demo condition: new copy.",
            seller: objectId(sellerEmail),
            images: [`/demo-books/${slug}.svg`],
            __v: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true, runValidators: true, timestamps: false }
      );
    }
    console.log(
      JSON.stringify({
        result: "Demo seed complete",
        database: mongoose.connection.name,
        demoUsers: await User.countDocuments({
          _id: { $in: accounts.map((a) => objectId(a.email)) },
        }),
        demoBooks: await Book.countDocuments({
          _id: { $in: catalogue.map(([slug]) => objectId(`book:${slug}`)) },
        }),
        credentialsFile: credentialPath,
      })
    );
  } finally {
    await mongoose.disconnect();
  }
}
main().catch((error) => {
  console.error(
    error.message.replace(
      /mongodb(?:\+srv)?:\/\/[^\s]+/g,
      "[database connection]"
    )
  );
  process.exitCode = 1;
});
