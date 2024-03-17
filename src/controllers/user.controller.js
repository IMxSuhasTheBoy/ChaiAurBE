import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    //* as userSchema having refreshToken field, it is for having value with this method call
    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });

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
  const { fullName, email, username, password } = req.body;
  //Examine  console.log("registerUser", req.body);

  //TODO: 2
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fiealds are required!!!");
  }

  //TODO: 3
  const existeduser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existeduser) {
    throw new ApiError(409, "User with email or username already exists!!!");
  }
  //examine console.log("30", req.files);

  //TODO: 4.1
  //*access of files is from multer.
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
    throw new ApiError(400, "Avatar file is reqired!!! not stored in local!!!");
  }

  //TODO: 4.3
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  //TODO: 4.4
  if (!avatar) {
    throw new ApiError(
      400,
      "Avatar file is reqired!!! not uploaded in cloud!!!"
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

  //TODO: 5.2 & 6
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

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
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(404, "User does't exist! ! !");
  }

  //TODO: 4
  //*bcrypt: additional methods in schema Object instance, user is our instance of User Schema
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials! ! !");
  }

  //TODO: 5
  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );

  //TODO: 6.1
  //? update variable of user object with accessToken / Have variable of user instance From DB with unnecessary fields ommited

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //TODO: 6.2
  const options = {
    httpOnly: true,
    secure: true,
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
});

const logoutUser = asyncHandler(async (req, res) => {
  // console.log("logoutUser verifiedJWT", req.user._id);

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
    httpOnly: true,
    secure: true,
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
    console.log("T2 decodedToken", decodedToken);

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
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefereshTokens(user._id);

    //TODO: 6
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed!!!"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refres Token! ! !");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  //TODO: 1
  const { oldPassword, newPassword } = req.body;

  //TODO: 2
  //  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/;
  //  if (!passwordRegex.test(newPassword)) {
  //    throw new ApiError(400, "Password does not meet the criteria. Please use a password with at least 8 characters, including uppercase, lowercase, numbers, and special characters! ! !");
  //  }

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
  console.log("getCurrentUser", req.user);
  //TODO: 1
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User found successfully!!!"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  //TODO: 1
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "Please provide full name and email! ! !");
  }

  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, user, "Account details updated successfully!!!")
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
};
