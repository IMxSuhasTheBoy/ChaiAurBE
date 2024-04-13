import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  destroyFileOnCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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

const registerUser = asyncHandler(async (req, res) => {
  /* test res.status(200).json({
    message: "Chai Aur Code",
  });*/

  //TODO: 1
  const { fullName, email, username, password } = req.body; //TODO: apply checks for valid email, password on frontend preferably
  // console.log("registerUser", req.body);

  //TODO: 2
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required! ! !");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.match(emailRegex)) {
    throw new ApiError(400, "Invalid email address! ! !");
  }

  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/;
  if (!passwordRegex.test(password)) {
    throw new ApiError(
      422,
      "Password does not meet the criteria. Please use a password with at least 8 characters, including uppercase, lowercase, numbers, and special characters! ! !"
    );
  }

  //TODO: 3
  const existeduser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existeduser) {
    throw new ApiError(409, "User with email or username already exists! ! !");
  }

  // console.log("registerUser TODO: 4", req.files);
  //TODO: 4.1
  //*access of files is from multer middleware.
  const avatarLocalPath = req.files?.avatar[0]?.path; //*Expecting: avatar is present, means- found the edge case to cover now with non required fields.
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  //*above edge case covered
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  //TODO: 4.2
  if (!avatarLocalPath) {
    throw new ApiError(
      400,
      "Avatar file is required!!! not stored in local! ! !"
    );
  }

  //TODO: 4.3
  const avatar = await uploadOnCloudinary(avatarLocalPath, "users/avatar");
  const coverImage = await uploadOnCloudinary(
    coverImageLocalPath,
    "users/coverImage"
  );
  // console.log("TODO: 4.3", avatar, coverImage);

  //TODO: 4.4
  if (!avatar) {
    throw new ApiError(
      400,
      "Avatar file is missing!!! not uploaded in cloud! ! !"
    );
  }

  //TODO: 5.1
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
  //? at the moment of user creation refreshToken isn't need to create?

  //TODO: 7.1
  if (!createdUser) {
    throw new ApiError(
      500,
      "Something went wrong while registering the user! ! !"
    );
  }

  //TODO: 7.2
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully!!!"));
});

const loginUser = asyncHandler(async (req, res) => {
  //TODO: 1
  const { email, username, password } = req.body;

  //TODO: 2
  if (!username && !email) {
    throw new ApiError(400, "Username and Email is reqired! ! !");
  }
  // Here is an alternative of above code based on logic :
  // if (!(username || email)) {
  //     throw new ApiError(400, "username or email is required")
  // }

  //TODO: 3
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  //? Here is an alternative of above code based on logic : what if an registered email is associated with more than 1 username/vise versa ?
  // const user = await User.findOne({ username, email });

  if (!user) {
    throw new ApiError(404, "User does not exist! ! !");
  }

  //TODO: 4
  //*bcrypt: additional methods in schema Object instance, user is our instance of User Schema
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials! ! !");
  }

  //TODO: 5
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  //TODO: 6.1 strategy for auth & session management:
  //? update variable of user object with accessToken / Have variable of user instance From DB with unnecessary fields ommited

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //console.log("loggedInUser", loggedInUser);

  //console.log(".env file options", process.env.HTTP_ONLY === "true"); //*For both true and false boolean values in .env, It will be treated as a string and when compared to 'true', it will evaluate to false/true respectively for both true and false values.

  //TODO: 6.2
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
  //sending accessToken and refreshToken in json response (data). Should be as per strategy requirement
});

const logoutUser = asyncHandler(async (req, res) => {
  //console.log("logoutUser verifiedJWT", req.user._id);

  console.log("logout", req, "logout");

  //TODO: 2.1 2.2
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  //TODO: 2.3
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

const refreshAccessToken = asyncHandler(async (req, res) => {
  //TODO: 1
  const incommingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incommingRefreshToken) {
    throw new ApiError(401, "Unauthorized request! ! !");
  }

  try {
    //TODO: 2
    const decodedToken = jwt.verify(
      incommingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    // console.log("T2 decodedToken", decodedToken);

    //TODO: 3
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError("Invalid refresh Token! ! !");
    }

    //TODO: 4
    if (incommingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used! ! !");
    }

    //TODO: 5
    const options = {
      httpOnly: process.env.HTTP_ONLY === "true",
      secure: process.env.SECURE === "true",
    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    //TODO: 6
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

const changeCurrentPassword = asyncHandler(async (req, res) => {
  //TODO: 1
  const { oldPassword, newPassword } = req.body;
  // console.log(oldPassword, newPassword);

  //TODO: 2
  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    throw new ApiError(
      400,
      "Password does not meet the criteria. Please use a password with at least 8 characters, including uppercase, lowercase, numbers, and special characters! ! !"
    );
  }

  //TODO: 3
  const user = await User.findById(req.user?._id);

  //TODO: 4
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password! ! !");
  }

  //TODO: 5
  user.password = newPassword;

  //TODO: 6
  await user.save({ validateBeforeSave: false });

  //TODO: 7
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed successfully!!!"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  //console.log("getCurrentUser", req.user);
  //TODO: 1
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User found successfully!!!"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  //TODO: 1
  const { fullName, email } = req.body;
  console.log("updateAccountDetails TODO:1", fullName, email);

  if (!fullName || !email) {
    throw new ApiError(400, "Please provide full name and email! ! !");
  }

  console.log("updateAccountDetails TODO:2", req.user?._id);
  //TODO: 2
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password");

  //TODO: 3
  return res
    .status(200)
    .json(
      new ApiResponse(200, user, "Account details updated successfully!!!")
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  //TODO: 4.1
  const oldAvatarCloudUrl = req.user.avatar;
  const folderPath = "chaiaurbe/users/avatars/";

  //TODO: 1
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "User avatar file is missing! ! !");
  }

  //TODO: 2
  const avatar = await uploadOnCloudinary(avatarLocalPath, "users/avatar");

  if (!avatar.url) {
    throw new ApiError(
      400,
      "Something went wrong while uploading user avatar! ! !"
    );
  }

  //TODO: 3
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  //TODO: 4.2 destroy old if cloud uploaded matches with DB updated ? destroy Old : move
  if (user.avatar === avatar.url) {
    await destroyFileOnCloudinary(folderPath, oldAvatarCloudUrl);
  } else {
    throw new ApiError(
      500,
      "Something went wrong while updating user avatar! ! !"
    );
  }

  //TODO: 5
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully!!!"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  //TODO: 4.1 old
  let coverImageOldCloudUrl = "";
  const folderPath = "chaiaurbe/users/cover-images/";

  //Strategy: Case: user haven't uploaded coverImage when registered, don't need to destroy coverImageOldCloudUrl.
  // Case: user had uploaded coverImage when registered, call destroy coverImageOldCloudUrl.
  if (req.user?.coverImage === "") {
  } else {
    coverImageOldCloudUrl = req.user?.coverImage;
  }

  //TODO: 1 new
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing! ! !");
  }

  //TODO: 2
  const coverImage = await uploadOnCloudinary(
    coverImageLocalPath,
    "users/coverImage"
  );

  if (!coverImage.url) {
    throw new ApiError(
      400,
      "Something went wrong while uploading cover image! ! !"
    );
  }

  //TODO: 3
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  if (!user.coverImage === coverImage.url) {
    throw new ApiError(
      500,
      "Something went wrong while updating user cover image in database! ! !"
    );
  }
  //? will destroy call exicute only after db updation success?

  //TODO: 4.2 strategy for calling destroy only if the coverImage was uploaded on registeration & cloud uploaded matches with DB updated
  if (coverImageOldCloudUrl !== "" && user.coverImage === coverImage.url) {
    await destroyFileOnCloudinary(folderPath, coverImageOldCloudUrl);
  }

  //TODO: 5
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully!!!"));
});

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

const getWatchHistory = asyncHandler(async (req, res) => {
  //TODO: 1
  // console.log("getWatchHistory current user id ", typeof req.user._id),

  console.log(
    await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.user._id),
        },
      },
    ])
  );
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
