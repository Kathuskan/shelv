require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/user");
async function main() {
  const email = process.argv[2]?.toLowerCase();
  if (!email || !email.includes("@"))
    throw new Error("Usage: npm run admin -- existing-account@example.com");
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOneAndUpdate(
    { email },
    { $set: { role: "admin" }, $inc: { __v: 1 } },
    { new: true }
  );
  if (!user) throw new Error("Register this account first.");
  console.log(`Administrator enabled for ${user.email}.`);
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
