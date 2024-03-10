// require("dotenv").config({ path: "./env" });
import dotenv from "dotenv";
import connectDB from "./db/dbIndex.js";
import { app } from "./app.js";

dotenv.config({ path: "./env" });
const PORT = process.env.PORT;
console.log(PORT)

// Handle unhandled promise rejections
// process.on("unhandledRejection", (reason, promise) => {
//   console.error("Unhandled Rejection at:", promise, "reason:", reason);
//   process.exit(1); // Exit the process with a non-zero status code
// });

connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("Server error!!!", error);
      process.exit(1);
    });
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running on port : ${PORT}\n`);
    });
  })
  .catch((err) => {
    console.log(`MongoDB connection failed!!! `, err);
  });

/* ///;(async () => {})();

1.approach DB Connection

import { Express } from "express";
const app = Express()

(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

    app.on("error" , (error) => {
      console.log("error", error);
      throw error
    });

    app.listen(process.env.PORT, () => {
      console.log(`app is listening on ${process.env.PORT}`);
    })

  } catch (error) {
    console.error("error", error);
    throw error;
  }
})();
*/
