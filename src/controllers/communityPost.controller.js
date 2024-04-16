import mongoose, { isValidObjectId } from "mongoose";
import { CommunityPost } from "../models/communityPost.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";

//TODO: create CommunityPost
const createCommunityPost = asyncHandler(async (req, res) => {
  let { content } = req.body;

  const isFieldEmpty = (field) => !field || field.trim() === "";
  if (isFieldEmpty(content)) {
    throw new ApiError(
      400,
      "content field for community post is required and should not be empty! ! !"
    );
  }

  try {
    content = content.trim();
    const communityPost = await CommunityPost.create({
      content: content,
      communityPostOwner: req.user?._id,
    });
    // console.log(communityPost, ": communityPost");

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

// TODO: get user CommunityPost figure out purose & output
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

  if (
    !isValidObjectId(communityPostId) ||
    communityPostId.trim() === "" ||
    !communityPostId
  ) {
    throw new ApiError(400, "Invalid communityPostId or not provided! ! !");
  }
  const communityPost = await CommunityPost.findById(communityPostId).exec();
  // console.log(communityPost, " : communityPost");
  if (!communityPost) {
    throw new ApiError(404, "Community post not found! ! !");
  }
  if (
    communityPost?.communityPostOwner.toString() !== req.user?._id.toString()
  ) {
    throw new ApiError(
      403,
      "You are not authorized to update this community post! ! !"
    );
  }

  const { newContent } = req.body;
  // console.log(newContent, ": newContent");
  const isFieldEmpty = (field) => !field || field.trim() === "";
  if (isFieldEmpty(newContent)) {
    throw new ApiError(
      400,
      "Update newContent field is required and should not be empty! ! !"
    );
  }

  if (communityPost.content !== newContent) {
    // console.log("~ DB communityPost details Update Operation initated~");

    //TODO: update CommunityPost
    communityPost.content = newContent.trim();
    const updatedCommunityPost = await communityPost.save(
      { validateBeforeSave: false },
      { new: true }
    );
    // console.log(updatedCommunityPost, " : updatedCommunityPost");
    if (!updatedCommunityPost) {
      throw new ApiError(500, "Failed to save updated community post! ! !");
    }
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedCommunityPost,
          "CommunityPost updated successfully!!!"
        )
      );
  } else {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          null,
          "No changes in newContent provided to update community post!!!"
        )
      );
  }
});

const deleteCommunityPost = asyncHandler(async (req, res) => {
  const { communityPostId } = req.params;
  console.log(communityPostId, ": communityPostId");

  if (
    !isValidObjectId(communityPostId) ||
    communityPostId.trim() === "" ||
    !communityPostId
  ) {
    throw new ApiError(400, "Invalid communityPostId or not provided! ! !");
  }
  //TODO: 2
  const communityPost = await CommunityPost.findById(communityPostId).exec();
  console.log(communityPost, " : communityPost");
  if (!communityPost) {
    //util
    throw new ApiError(404, "Community post not found! ! !");
  }
  if (
    communityPost.communityPostOwner?.toString() !== req.user?._id.toString()
  ) {
    throw new ApiError(
      403,
      "You are not authorized to delete this community post! ! !"
    );
  }

  const deletedCommunityPost = await communityPost.deleteOne().exec();
  console.log(deletedCommunityPost, ": deletedCommunityPost-");
  if (!deletedCommunityPost.acknowledged)
    throw new ApiError(500, "Failed to delete community post! ! !");
  //likes delete
  const deletedCPLikes = await Like.deleteMany({
    communityPost: new mongoose.Types.ObjectId(communityPost._id),
  });
  console.log(deletedCPLikes, ": deletedCPLikes-");
  //comments find
  const cPComments = await Comment.find({
    communityPost: new mongoose.Types.ObjectId(communityPost._id),
  });
  // each comment likes & comment delete
  const deleteOperations = cPComments.forEach(async (element) => {
    const deletedCommentLikes = await Like.deleteMany({
      comment: element._id,
    });
    console.log(deletedCommentLikes, ": deletedCommentLikes-");

    if (
      (deletedCommentLikes.acknowledged &&
        deletedCommentLikes.deletedCount === 0) ||
      (deletedCommentLikes.acknowledged && deletedCommentLikes.deletedCount > 0)
    ) {
      const deletedcPCommentsElems = await Comment.deleteMany({
        _id: element._id,
      }).exec();
      console.log(deletedcPCommentsElems, ": deletedcPCommentsElems-");
    }
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        communityPost,
        "Community post deleted succesfully with all related likes and comments!!!"
      )
    );
});

export {
  createCommunityPost,
  getUserTweets,
  updateCommunityPost,
  deleteCommunityPost,
};
