require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const books = mongoose.connection.collection("books");
  const users = mongoose.connection.collection("users"),
    unverifiedPending = { sellerStatus: "pending", emailVerifiedAt: null };
  const rentals = { listingType: "Rent", status: { $ne: "archived" } },
    missing = {
      listingType: "Sale",
      $or: [
        { stock: { $exists: false } },
        { deliveryFee: { $exists: false } },
        { status: { $exists: false } },
        { __v: { $exists: false } },
      ],
    };
  console.log({
    unverifiedApplicationsToReopen: await users.countDocuments(
      unverifiedPending
    ),
    rentalListingsToArchive: await books.countDocuments(rentals),
    saleListingsToInitialize: await books.countDocuments(missing),
    mode: process.argv.includes("--apply") ? "apply" : "dry run",
  });
  if (process.argv.includes("--apply")) {
    await users.updateMany(unverifiedPending, {
      $set: { sellerStatus: "none" },
      $unset: { verificationCode: 1 },
    });
    await books.updateMany(rentals, {
      $set: { status: "archived" },
      $inc: { __v: 1 },
    });
    // Set defaults only when absent; do not overwrite inventory, prices or delivery fees.
    for (const [key, value] of Object.entries({
      stock: 1,
      deliveryFee: 0,
      status: "active",
      __v: 0,
    }))
      await books.updateMany(
        { listingType: "Sale", [key]: { $exists: false } },
        { $set: { [key]: value } }
      );
    console.log(
      "Migration complete. Review stock, condition and delivery fee on every existing listing before accepting orders."
    );
  }
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
