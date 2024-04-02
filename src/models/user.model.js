import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken"; //* JWT is a bearer token (a key: who owns it, gets access).
//Docs : https://github.com/auth0/node-jsonwebtoken#readme

import bcrypt from "bcrypt";

///Docs : https://mongoosejs.com/docs/schematypes.html
const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String,
      required: true,
    },
    coverImage: {
      type: String,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

//TODO: only exicute the middleware on password changes, Is to be taken care of.
/**
 * Middleware function to be executed before saving a user document.
 * It checks if the password field has been modified. If not, it proceeds with the next middleware.
 * If the password has been modified, it hashes the password and then proceeds with the next middleware.
 *
 * @param {Function} next - The callback function to signal completion of the middleware function
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next(); // Proceed with the next middleware if password is not modified.
  }

  this.password = await bcrypt.hash(this.password, 10); // Hash the password and store it in this.password

  next();
});

//---------------------- Additional methods in schema object ----------------------
//TODO: To compare (PW received in user req.) with the (recent saved PW).
/**
 * Compares the received password with the saved password.
 * @param {string} password - The password received in the user request
 * @returns {boolean} - Returns true if the passwords match, false otherwise
 */
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

//TODO: To generate access token & refresh token, With JWT. That can be used for authentication and authorization purposes in a web application.
userSchema.methods.generateAccessToken = function () {
  /**
   * Generates an access token for the user based on the user's information.
   * @memberof userSchema.methods
   * @returns {string} The generated access token. ex: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjExMjM0NTYifQ.fZY1NpEvKzR_Dj0jfQ0wZGwfq-jRJ_YzCZu-U_QiCqw
   */
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  /**
   * Generates a refresh token for the user.
   * @memberof userSchema.methods
   * @return {string} A JSON web token for refreshing user authentication.
   */
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};
//---------------------- Additional methods in schema object-----------------------

export const User = mongoose.model("User", userSchema);
