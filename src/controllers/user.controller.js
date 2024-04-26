import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import fs from "fs";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  destroyFileOnCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

import { User } from "../models/user.model.js";

const generateAccessAndRefreshTokens = async (userId) => {
  /**Generate access and refresh tokens for a user.
   * save refresh token in user document.
   * strategy for auth & session management:
   * return access and refresh tokens.
   * @param {String} userId - The ID of the user.
   * @return {Object} Returns an object containing the access token and refresh token.
   */
  try {
    const user = await User.findById(userId);
    // console.log("genAccRefTokens", user);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false }); //Because in this case unnecessary model validation will be triggered at saving the document

    // console.log("genAccRefTokens", user);

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token! ! !"
    );
  }
};

//TODO: The fn creates new user document, (the locally stored files are kept for uploading when registering user fails due to conflict error, for case of retry upload), (user email & fullname conflicts while registering,  so only unique email & fullname combination is allowed per user)
const registerUser = asyncHandler(async (req, res) => {
  /* test res.status(200).json({
    message: "Chai Aur Code",
  });*/

  //TODO: 1 take fields
  const { fullName, email, username, password } = req.body; //TODO: apply checks for valid email, password on frontend preferably
  // console.log("registerUser", req.body);

  //TODO: 2 check for empty & valid fields
  if (
    [fullName, email, username, password].some(
      (field) => field?.trim() === "" || !field
    )
  )
    throw new ApiError(400, "All fields are required! ! !");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email))
    throw new ApiError(
      400,
      "Email does not meet the criteria. Please use a email address with a valid domain! ! !"
    );

  const usernameRegex = /^[^\s]{1,12}$/;
  if (!usernameRegex.test(username))
    throw new ApiError(
      400,
      "Username does not meet the criteria. Please use a username with 1-12 characters with no spaces! ! !"
    );

  const fullNameRegex = /^(?:[A-Za-z]+\s?){1,3}[A-Za-z]+$/;
  if (!fullNameRegex.test(fullName))
    throw new ApiError(
      400,
      "Full name does not meet the criteria. Please use a full name with no special characters! ! !"
    );

  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/;
  if (!passwordRegex.test(password))
    throw new ApiError(
      422,
      "Password does not meet the criteria. Please use a password with at least 8 characters, including uppercase, lowercase, numbers, and special characters! ! !"
    );

  //TODO: 3 check for existing user
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    // fs.unlinkSync(req.files.avatar[0].path); //!test
    // fs.unlinkSync(req.files.coverImage[0].path); //!test for in case dont need to keep local files
    throw new ApiError(409, "User with email or username already exists! ! !");
  }

  // console.log("registerUser TODO: 4", req.files);
  //TODO: 4.1 check for files
  //*access of files is from multer middleware.
  const avatarLocalPath = req.files?.avatar?.[0]?.path; //*Expecting: avatar is present, means- found the edge case to cover now with non required fields.
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  //*above edge case covered
  let coverImageLocalPath = null;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  //TODO: 4.2
  if (!avatarLocalPath)
    throw new ApiError(
      400,
      "Avatar file is required!!! not stored in local! ! !"
    );

  //TODO: 4.3 upload files & check for success
  const avatar = await uploadOnCloudinary(avatarLocalPath, "users/avatar");

  let coverImage = null;
  if (coverImageLocalPath) {
    coverImage = await uploadOnCloudinary(
      coverImageLocalPath,
      "users/coverImage"
    );
  }
  // console.log("TODO: 4.3", avatar, coverImage);

  //TODO: 4.4
  if (!avatar)
    throw new ApiError(
      400,
      "Avatar file is missing!!! not uploaded in cloud! ! !"
    );

  //TODO: 5.1 create user
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });
  // console.log("TODO:5.1", user); //may required to throw error if user is not created.

  //TODO: 5.2 & 6
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //TODO: 7.1 check for success
  if (!createdUser)
    throw new ApiError(
      500,
      "Something went wrong while registering the user! ! !"
    );

  //TODO: 7.2
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully!!!"));
});

//TODO: The fn logins user with requested credentials (generates tokens, sets cookies)
const loginUser = asyncHandler(async (req, res) => {
  //TODO: 1 take fields
  const { email, username, password } = req.body;
  console.log("loginUser", email, username, password);

  //TODO: 2 check for empty & valid fields //validation of syntax for email must be on frontend
  if ([email, username].some((field) => field?.trim() === "" || !field))
    throw new ApiError(400, "Please provide username and email! ! !");
  // Here is an alternative of above code based on logic :
  // if (!(username || email))
  //     throw new ApiError(400, "username or email is required")

  //TODO: 3 check for existing user
  const user = await User.findOne({ username, email });
  // const user = await User.findOne({
  //   $or: [{ username }, { email }],
  // });

  if (!user) throw new ApiError(404, "User does not exist! ! !");

  //TODO: 4 check for password
  //*bcrypt: additional methods of User schema Object instance
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid)
    throw new ApiError(401, "Invalid user credentials! ! !");

  //TODO: 5 generate tokens & save refresh token in user document
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  //TODO: 6.1 strategy for auth & session management:
  //? update variable of user object with accessToken / Have variable of user instance From DB with unnecessary fields ommited
  try {
    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    //console.log("loggedInUser : ", loggedInUser);

    //console.log(".env file options", process.env.HTTP_ONLY === "true"); //*For both true and false boolean values in .env, It will be treated as a string and when compared to 'true', it will evaluate to false/true respectively for both true and false values.

    //TODO: 6.2 cookies for auth & session management
    const options = {
      httpOnly: process.env.HTTP_ONLY === "true",
      secure: process.env.SECURE === "true",
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: loggedInUser,
            accessToken,
            refreshToken,
          },
          "User logged In Successfully!!!"
        )
      );
  } catch (error) {
    throw new ApiError(500, error?.message || "Failed to log in user! ! !");
  }
  //!sending accessToken and refreshToken in json response (data). Should be as per strategy requirement
});

//TODO: The fn logs out the currently logged in user (clears cookies, user refresh token)
const logoutUser = asyncHandler(async (req, res) => {
  //TODO: 2.1 2.2 find and remove field refreshToken from user document
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  //TODO: 2.3 clear cookies
  const options = {
    httpOnly: process.env.HTTP_ONLY === "true",
    secure: process.env.SECURE === "true",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out!!!"));
});

//TODO: The fn refreshes access token when, everytime user log in, when cookie refresh token have valid validity
const refreshAccessToken = asyncHandler(async (req, res) => {
  //TODO: 1 check refresh token
  const incommingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incommingRefreshToken)
    throw new ApiError(401, "Unauthorized request! ! !");

  try {
    //TODO: 2 decode with secret key
    const decodedToken = jwt.verify(
      incommingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    // console.log("T2 decodedToken", decodedToken);

    //TODO: 3 find user by matching refresh token
    const user = await User.findById(decodedToken?._id);

    if (!user) throw new ApiError("Invalid refresh Token! ! !");

    //TODO: 4 verify refresh token
    if (incommingRefreshToken !== user.refreshToken)
      throw new ApiError(401, "Refresh token is expired or used! ! !");

    //TODO: 5 generate new tokens & save refresh token in user document
    const options = {
      httpOnly: process.env.HTTP_ONLY === "true",
      secure: process.env.SECURE === "true",
    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    //TODO: 6 set cookies
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed!!!"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh Token! ! !");
  }
});

//TODO: The fn changes password of currently logged in user
const changeCurrentPassword = asyncHandler(async (req, res) => {
  //TODO: 1 take & check fields
  const { oldPassword, newPassword } = req.body;
  // console.log(oldPassword, newPassword);

  if (
    [oldPassword, newPassword].some((field) => field?.trim() === "" || !field)
  )
    throw new ApiError(
      400,
      "Please provide old password and new password! ! !"
    );

  //TODO: 2 check for empty & valid fields
  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/;
  if (!passwordRegex.test(newPassword))
    throw new ApiError(
      400,
      "Password does not meet the criteria. Please use a password with at least 8 characters, including uppercase, lowercase, numbers, and special characters! ! !"
    );

  //TODO: 3 check for existing user
  const user = await User.findById(req.user?._id);

  //TODO: 4 verify incomming old password with custom method in user instance
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) throw new ApiError(400, "Invalid old password! ! !");

  //TODO: 5 set new password
  user.password = newPassword;

  //TODO: 6 save user
  await user.save({ validateBeforeSave: false });

  //TODO: 7
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed successfully!!!"));
});

//TODO: The fn returns currently logged in user
const getCurrentUser = asyncHandler(async (req, res) => {
  //console.log("getCurrentUser", req.user);
  //TODO: 1
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User found successfully!!!"));
});

//TODO: The fn updates user details with atleast any of the fullname, email provided fields !mplement otp validation
const updateAccountDetails = asyncHandler(async (req, res) => {
  //TODO: 1 take fields
  const { fullName, email } = req.body;
  console.log("updateAccountDetails", fullName, email);

  const user = await User.findById(req.user?._id).select("-password");
  console.log(user, " updateAccountDetails user");

  //TODO: 2 check is atleast one field provided
  if (!fullName && !email) {
    throw new ApiError(
      400,
      "Please provide atleast one of the email or fullName field! ! !"
    );
  }

  let flag = 0;
  //TODO: 3 new field differs from old field ? (valid ? save : error) : move
  if (fullName && fullName !== user.fullName) {
    const fullNameRegex = /^(?:[A-Za-z]+\s?){1,3}[A-Za-z]+$/;
    console.log(" in f");
    if (fullNameRegex.test(fullName)) {
      user.fullName = fullName;
      flag += 1;
    } else {
      throw new ApiError(400, "Invalid full name! ! !");
    }
  }

  if (email && email !== user.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    console.log(" in e");
    if (emailRegex.test(email)) {
      user.email = email;
      flag += 1;
    } else {
      throw new ApiError(400, "Invalid email address! ! !");
    }
  }

  //TODO: 4 detected no changes ? return user : save changes & return user
  if (flag === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, user, "No changes made!!!"));
  }

  //TODO: 3
  user.save({ validateBeforeSave: false });

  //TODO: 3 find & update user, without validations & additional checks, alternatively
  // const user = await User.findByIdAndUpdate(
  //   req.user?._id,
  //   {
  //     $set: {
  //       fullName,
  //       email,
  //     },
  //   },
  //   { new: true }
  // ).select("-password");

  //TODO: 4
  return res
    .status(200)
    .json(
      new ApiResponse(200, user, "Account details updated successfully!!!")
    );
});

//TODO: The fn updates user avatar file & deletes old file when new file save success
const updateUserAvatar = asyncHandler(async (req, res) => {
  //TODO: 4.1 have old file url
  const oldAvatarCloudUrl = req.user.avatar;
  const folderPath = "chaiaurbe/users/avatars/";

  //TODO: 1 take local path from middleware
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath)
    throw new ApiError(400, "User avatar file is missing! ! !");

  //TODO: 2 save file on cloud
  const avatar = await uploadOnCloudinary(avatarLocalPath, "users/avatar");

  if (!avatar?.url)
    throw new ApiError(
      400,
      "Something went wrong while uploading user avatar! ! !"
    );

  //TODO: 3 find & save user with new file url
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  //TODO: 4.2 cloud uploaded matches with DB updated ? destroy Old : error
  if (user.avatar === avatar.url) {
    await destroyFileOnCloudinary(folderPath, oldAvatarCloudUrl);
  } else {
    throw new ApiError(
      500,
      "Something went wrong while updating user avatar! ! !"
    );
  }
  //! when fails to update avatar in db/cloud upload, the local file is kept for retrying upload operation case.

  //TODO: 5
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully!!!"));
});

//TODO: The fn updates / set user coverimage file & deletes old file* when new file save sucess
const updateUserCoverImage = asyncHandler(async (req, res) => {
  //TODO: 4.1 have old file if found
  let coverImageOldCloudUrl = null;
  const folderPath = "chaiaurbe/users/cover-images/";

  //Strategy: Case: user haven't uploaded coverImage when registered, don't need to destroy coverImageOldCloudUrl.
  // Case: user had uploaded coverImage when registered, call destroy coverImageOldCloudUrl.
  if (req.user?.coverImage === "") {
  } else {
    coverImageOldCloudUrl = req.user?.coverImage;
  }

  //TODO: 1 take local path from middleware
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath)
    throw new ApiError(400, "Cover image file is missing! ! !");

  //TODO: 2 save on cloud
  const coverImage = await uploadOnCloudinary(
    coverImageLocalPath,
    "users/coverImage"
  );

  if (!coverImage.url)
    throw new ApiError(
      400,
      "Something went wrong while uploading cover image! ! !"
    );

  //TODO: 3 find & save user with new file url
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  if (!user.coverImage === coverImage.url)
    throw new ApiError(
      500,
      "Something went wrong while updating user cover image in database! ! !"
    );
  //! when fails to update cover image in DB/cloud upoad, the local file is kept for retry upload operation case.

  //TODO: 4.2 strategy for calling destroy only if the coverImage was uploaded on registeration & cloud uploaded matches with DB updated
  if (!coverImageOldCloudUrl && user.coverImage === coverImage.url)
    await destroyFileOnCloudinary(folderPath, coverImageOldCloudUrl);

  //TODO: 5
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully!!!"));
});

//TODO: pupose unclear about who is gona use to get profile, (only profile of user it self / anyone anyones profile)
const getUserChannelProfile = asyncHandler(async (req, res) => {
  //TODO: 1
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Please provide username! ! !");
  }

  //TODO: 2
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions", //look into this target model instance name
        localField: "_id", // local join field in this model instance field name
        foreignField: "channel", // The target join field in the target model
        as: "subscribers", // The name for the results. its an array containing all the documents from the target model
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber", //Finding : req.user._id: subscriber of / how many channels is he subscribed to
        as: "subscribedTo",
      },
    },

    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers", //counts the number of documents in an array
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] }, //check if logged in user is present in subscribers $in can check Objects & Arrys.
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);
  console.log("Channel[0", channel); //aggregation pipeline output :: [Object]

  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exists! ! !");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully!!!")
    );
});

//
const getWatchHistory = asyncHandler(async (req, res) => {
  //TODO: 1
  // console.log("getWatchHistory current user id ", typeof req.user._id),

  // console.log(
  //   await User.aggregate([
  //     {
  //       $match: {
  //         _id: new mongoose.Types.ObjectId(req.user._id),
  //       },
  //     },
  //   ])
  // );
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    }, //Got logged in user from DB to get his watchHistory
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory", //users model watchHistory field
        foreignField: "_id",
        as: "watchHistory", //Got all the videos(_id) from watchHistory array from user instance
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner", //videos model owner field
              foreignField: "_id",
              as: "owner", //Got owner details(_id) from user instance
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  }, //only want fullName, username and avatar from user instance as owner details in video instance
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            }, //An addFields stage is being used here to reshape the data by extracting the first element of the "owner" array and assigning it to the "owner" field.
          },
        ],
      },
    },
  ]);

  //TODO: 2
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully!!!"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
