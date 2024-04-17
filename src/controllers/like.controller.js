import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  existsCheck,
  isInvalidOrEmptyId,
} from "../utils/validAndExistsCheck.js";

import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { CommunityPost } from "../models/communityPost.model.js";
import { Comment } from "../models/comment.model.js";

//TODO: The fn either adds a new like or removes an existing like only when the video exists && published: true
const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  //TODO: 1 check videoId
  if (isInvalidOrEmptyId(videoId))
    throw new ApiError(400, "Invalid video id or not provided! ! !");

  //TODO: 2 find video
  const videoExists = await Video.findOne({ _id: videoId });

  if (!videoExists) existsCheck(videoId, Video, "toggleVideoLike"); //!experimental

  const errorMessage = !videoExists
    ? "Video does not exist! ! !"
    : !videoExists.isPublished
      ? "Video is not yet published, Cannot like a video which is not published! ! !"
      : null;
  //Checks if a video exists and if it is published before allowing a like to be added. If the video does not exist or is not published, it throws an error.
  //If the video exists and is published, the errorMessage variable will be null, and the code will continue without throwing an error.
  if (errorMessage) throw new ApiError(404, errorMessage);

  const credentials = { video: videoExists._id, likedBy: req.user?._id };

  try {
    //TODO: 3 if user like doc found & deletes suceessfully? respond unliked : create new like
    const existingLike = await Like.findOneAndDelete(credentials); //returns null if not found

    if (!existingLike) {
      const newLike = await Like.create(credentials);

      if (!newLike)
        throw new ApiError(500, "Error in adding like to video! ! !");

      return res
        .status(201)
        .json(
          new ApiResponse(200, newLike, "User liked the video successfully!!!")
        );
    }
    return res.status(200).json(
      new ApiResponse(
        // { unlikedVideo: existingLike },
        null,
        "User unliked the video successfully!!!"
      )
    );
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Error in toggling video like! ! !"
    );
  }
});

//TODO: The fn either adds a new like or removes an existing like only when the communityPost exists
const toggleCommunityPostLike = asyncHandler(async (req, res) => {
  const { communityPostId } = req.params;

  //TODO: 1 check communityPostId
  if (isInvalidOrEmptyId(communityPostId))
    throw new ApiError(400, "Invalid community post id or not provided! ! !");

  //TODO: 2 check communityPost exists ? {_id} : null
  const communityPostExistsId = await CommunityPost.exists({
    _id: communityPostId,
  });

  if (!communityPostExistsId._id) {
    //!experimental
    existsCheck(communityPostId, CommunityPost, "toggleCommunityPostLike");
    throw new ApiError(404, "Community post not found! ! !");
  }

  const credentials = {
    communityPost: communityPostExistsId._id,
    likedBy: req.user?._id,
  };

  try {
    //TODO: 3 if user like doc found & deletes suceessfully? respond unliked : create new like
    const existingLike = await Like.findOneAndDelete(credentials);

    if (!existingLike) {
      const newLike = await Like.create(credentials);

      if (!newLike)
        throw new ApiError(500, "Error in adding like to community post! ! !");

      return res
        .status(201)
        .json(
          new ApiResponse(
            200,
            newLike,
            "User liked the community post successfully!!!"
          )
        );
    }
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          null,
          "User unliked the communityPost successfully!!!"
        )
      );
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Error in toggling communityPost like! ! !"
    );
  }
});

//TODO: The fn either adds a new like or removes an existing like only when the comment exists
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  //TODO: 1 check commentId
  if (isInvalidOrEmptyId(commentId))
    throw new ApiError(400, "Invalid comment id or not provided! ! !");

  //TODO: 2 check comment exists ? {_id} : null
  const commentExistsId = await Comment.exists({
    _id: commentId,
  });

  if (!commentExistsId._id) {
    //!experimental
    existsCheck(commentId, Comment, "toggleCommentLike");
    throw new ApiError(404, "Comment does not exist! ! !");
  }

  const credentials = {
    comment: commentExistsId._id,
    likedBy: req.user?._id,
  };
  try {
    //TODO: 3 if user like doc found & deletes suceessfully? respond unliked : create new like
    const existingLike = await Like.findOneAndDelete(credentials);

    if (!existingLike) {
      const newLike = await Like.create(credentials);

      if (!newLike)
        throw new ApiError(500, "Error in adding like to comment! ! !");

      return res
        .status(201)
        .json(
          new ApiResponse(
            200,
            newLike,
            "User liked the comment successfully!!!"
          )
        );
    }
    return res
      .status(200)
      .json(
        new ApiResponse(200, null, "User unliked the comment successfully!!!")
      );
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Error in toggling comment like! ! !"
    );
  }
});

export { toggleCommentLike, toggleCommunityPostLike, toggleVideoLike };
