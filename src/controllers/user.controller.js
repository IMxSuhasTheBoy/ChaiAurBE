import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  /* test res.status(200).json({
    message: "Chai Aur Code",
  });*/

  //TODO: 1
  const { fullName, email, username, password } = req.body;
  //Examine  console.log("14", req.body);

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

export { registerUser };
