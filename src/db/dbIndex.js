/// 2.approach DB Connection
import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    console.log(`\nMongoDB connected ! ! ! DB HOST: ${connectionInstance.connection.host}`);
  } catch (err) {
    console.log("MongoDB connection Failed!!!", err);
    process.exit(1);
  }
};

//* any async func as above returns a promise, in this case will be using it to export & on exicution will listen to express app in the index.js file.

export default connectDB;
