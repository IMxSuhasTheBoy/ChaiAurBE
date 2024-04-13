import mongoose, { isValidObjectId } from "mongoose";
import { CommunityPost } from "../models/communityPost.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//TODO: create CommunityPost
const createCommunityPost = asyncHandler(async (req, res) => {
  const { content } = req.body;

  const isFieldEmpty = (field) => !field || field.trim() === "";

  if (isFieldEmpty(content)) {
    throw new ApiError(
      400,
      "content field for community post is required and should not be empty! ! !"
    );
  }

  try {
    const communityPost = await CommunityPost.create({
      content: content,
      communityPostOwner: req.user?._id,
    });
    console.log(communityPost, ": communityPost");

    return res
      .status(201)
      .json(
        new ApiResponse(
          200,
          communityPost,
          "Community post created successfully!!!"
        )
      );
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Error in creating communityPost! ! !"
    );
  }
});

// TODO: get user CommunityPost
const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.query;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid userId! ! !");
  }

  //   if (userId !== req.user?._id.toString()) {
  //     throw new ApiError(403, "You cannot view others posts! ! !");
  //   }
});

const updateCommunityPost = asyncHandler(async (req, res) => {
  const { communityPostId } = req.params;
  // console.log(communityPostId, ": communityPostId");
  const userId = req.user?._id;

  if (
    !isValidObjectId(communityPostId) ||
    communityPostId.trim() === "" ||
    !communityPostId
  ) {
    throw new ApiError(400, "Invalid communityPostId or not provided! ! !");
  }
  const isCommunityPost = await CommunityPost.findById(communityPostId).exec();
  // console.log(communityPost, " : communityPost");
  if (!isCommunityPost) {
    throw new ApiError(404, "Community post not found! ! !");
  }
  if (isCommunityPost?.communityPostOwner.toString() !== userId.toString()) {
    throw new ApiError(403, "You cannot update others posts! ! !");
  }

  const { updateContent } = req.body;
  // console.log(updateContent, ": updateContent");
  const isFieldEmpty = (field) => !field || field.trim() === "";
  if (isFieldEmpty(updateContent)) {
    throw new ApiError(
      400,
      "Update content field is required and should not be empty! ! !"
    );
  }

  //TODO: update CommunityPost
  try {
    // const updatedCommunityPost = await CommunityPost.findByIdAndUpdate(
    //   communityPostId,
    //   {
    //     $set: { content: updateContent },
    //   },
    //   { new: true }
    // );
    isCommunityPost.content = updateContent;

    const updatedCommunityPost = await isCommunityPost.save(
      { validateBeforeSave: false },
      { new: true }
    );
    console.log(updatedCommunityPost, " : updatedCommunityPost");
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedCommunityPost,
          "CommunityPost updated successfully!!!"
        )
      );
  } catch (error) {
    throw new ApiError(500, error?.message || "Error in updating post! ! !");
  }
});

const deleteCommunityPost = asyncHandler(async (req, res) => {
  const { communityPostId } = req.params;
  // console.log(communityPostId, ": communityPostId");
  const userId = req.user?._id;

  if (
    !isValidObjectId(communityPostId) ||
    communityPostId.trim() === "" ||
    !communityPostId
  ) {
    throw new ApiError(400, "Invalid communityPostId or not provided! ! !");
  }
  //TODO: 2
  const communityPost = await CommunityPost.findById(communityPostId).exec();
  // console.log(communityPost, " : communityPost");
  if (!communityPost) {
    throw new ApiError(404, "Community post not found! ! !");
  }
  if (communityPost?.communityPostOwner.toString() !== userId.toString()) {
    throw new ApiError(403, "You cannot delete others posts! ! !");
  }

  const deletedCommunityPost = await communityPost.deleteOne().exec();
  // if(deleteCommunityPost){} else{}
  try {
    console.log(deletedCommunityPost, " : deletedCommunityPost");

    //!mplement delete (communityPost-likes)

    //!mplement delete related (comments + comment-likes) {when delete post success}

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          deletedCommunityPost,
          "Community post deleted successfully!!!"
        )
      );
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Error in deleting community post! ! !"
    );
  }
});

export {
  createCommunityPost,
  getUserTweets,
  updateCommunityPost,
  deleteCommunityPost,
};
