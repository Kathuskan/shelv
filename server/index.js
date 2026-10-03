require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const mongoose = require("mongoose");
const createApp = require("./app");
const startWorker = require("./services/worker");
async function start() {
  if (
    !process.env.MONGO_URI ||
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET.length < 32
  )
    throw new Error(
      "Set MONGO_URI and a JWT_SECRET of at least 32 characters in server/.env."
    );
  await mongoose.connect(process.env.MONGO_URI);
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== "isdbgrid")
    throw new Error(
      "Orders require MongoDB Atlas or a MongoDB replica set for transactions."
    );
  await Promise.all(
    Object.values(mongoose.models).map((model) => model.init())
  );
  const app = createApp(),
    stopWorker = startWorker(app);
  const server = app.listen(process.env.PORT || 5001, () =>
    console.log(
      `Shelv API ready — database: ${mongoose.connection.name}, user collection: users`
    )
  );
  async function stop() {
    stopWorker();
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  }
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
