/// 2.approach DB Connection
import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.error(
      "MongoDB connection Failed! ! ! MONGODB_URI not found in env"
    );
    process.exit(1);
  }
  if (!DB_NAME) {
    console.error("MongoDB connection Failed! ! ! DB_NAME not found");
    process.exit(1);
  }

  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    if (!connectionInstance || !connectionInstance.connection) {
      throw new Error(
        "MongoDB connection Failed! ! ! connectionInstance is null\n"
      );
    }
    console.log(
      `\nMongoDB connected ! ! ! DB HOST: ${connectionInstance.connection.host}\n`
    );
  } catch (error) {
    console.error(`MongoDB connection Failed! ! ! : ${error}\n`);

    if (!error) {
      console.error("MongoDB connection Failed! ! ! Unknown Error\n");
    }
    process.exit(1);
  }
};

//* any async func as above returns a promise, in this case will be using it to export & on exicution will listen to express app in the index.js file.

export default connectDB;
