import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  existsCheck,
  isInvalidOrEmptyId,
} from "../utils/validAndExistsCheck.js";

import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { CommunityPost } from "../models/communityPost.model.js";

// TODO: The fn either adds a new like or removes an existing like only when the comment exists
const addCommentOnVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  //TODO: 1 check videoId
  if (isInvalidOrEmptyId(videoId)) {
    throw new ApiError(400, "Invalid video id or not provided! ! !");
  }
  //TODO: 2 find video
  const videoExists = await Video.findOne({ _id: videoId });

  if (!videoExists) existsCheck(videoId, Video, "toggleVideoLike"); //!experimental

  const errorMessage = !videoExists
    ? "Video does not exist! ! !"
    : !videoExists.isPublished
      ? "Video is not yet published, Cannot comment on a video which is not published! ! !"
      : null;
  //Checks if a video exists and if it is published before allowing a comment to be added. If the video does not exist or is not published, it throws an error.
  //If the video exists and is published, the errorMessage variable will be null, and the code will continue without throwing an error.
  if (errorMessage) throw new ApiError(404, errorMessage);

  const { content } = req.body;

  //TODO: 3 check content
  if (!content || content.trim() === "")
    throw new ApiError(
      400,
      "Content field for comment is required and should not be empty! ! !"
    );

  try {
    //TODO: 4 create comment
    const commentCreated = await Comment.create({
      content: content,
      commentOwner: req.user?._id,
      video: videoExists._id,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(
          200,
          commentCreated,
          "Comment added on video successfully!!!"
        )
      );
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Error in creating comment for video! ! !"
    );
  }
});

// TODO: The fn either adds a new like or removes an existing like only when the communityPost exists
const addCommentOnCommunityPost = asyncHandler(async (req, res) => {
  const { communityPostId } = req.params;

  //TODO: 1 check communityPostId
  if (isInvalidOrEmptyId(communityPostId))
    throw new ApiError(400, "Invalid community post id or not provided! ! !");

  //TODO: 2 find community post
  const communityPostExists = await CommunityPost.findOne({
    _id: communityPostId,
  });

  if (!communityPostExists) {
    existsCheck(communityPostId, CommunityPost, "addCommentOnCommunityPost"); //!experimental
    throw new ApiError(404, "Community post not found! ! !");
  }

  const { content } = req.body;

  //TODO: 3 check content
  if (!content || content.trim() === "")
    throw new ApiError(
      400,
      "Content field for comment is required and should not be empty! ! !"
    );

  try {
    //TODO: 4 create comment
    const commentCreated = await Comment.create({
      content: content,
      commentOwner: req.user?._id,
      communityPost: communityPostExists._id,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(
          200,
          commentCreated,
          "Comment added on community post successfully!!!"
        )
      );
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Error in creating comment for community post! ! !"
    );
  }
});

// TODO: The fn updates the requested comment only when new content provided in the request body.
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  //TODO: 1 check commentId
  if (isInvalidOrEmptyId(commentId))
    throw new ApiError(400, "Invalid comment id or not provided! ! !");

  //TODO: 2 find comment
  const commentExists = await Comment.findById(commentId).exec();

  if (!commentExists) {
    existsCheck(commentId, Comment, "updateComment");
    throw new ApiError(404, "Comment not found! ! !");
  }

  //TODO: 3 check user is the owner of the comment
  if (commentExists.commentOwner?.toString() !== req.user?._id.toString())
    throw new ApiError(
      403,
      "You are not authorized to update this comment! ! !"
    );

  //TODO: 4 check if the comment belongs to either a video or a community post ? next check : error
  const commentBelongsToExists =
    commentExists.video || commentExists.communityPost;

  if (!commentBelongsToExists)
    throw new ApiError(
      404,
      "Comment does not belong to a video or a community post! ! !-"
    );

  //TODO: 5 check if the comment belongs to a community post, check if the community post exists ? move 7 : error
  if (commentExists.communityPost) {
    const communityPostExistsId = await CommunityPost.exists(
      commentExists.communityPost
    ).exec();

    if (!communityPostExistsId) {
      existsCheck(commentExists.communityPost, CommunityPost, "updateComment"); //!experimental
      throw new ApiError(404, "Community post not found! ! !-");
    }
  } else if (commentExists.video) {
    //TODO: 6 check if the comment belongs to a video, check if the video exists and is published ? move 7 : error
    const video = await Video.findById(commentExists.video).exec();
    if (video) {
      if (!video.isPublished)
        throw new ApiError(
          404,
          "Video is not yet published, Cannot update comment! ! !"
        );
    } else {
      existsCheck(commentExists.video, Video, "updateComment");
      throw new ApiError(404, "Video not found! ! !-");
    }
  }

  const { newContent } = req.body;

  //TODO: 7 check newContent
  if (!newContent || newContent.trim() === "")
    throw new ApiError(
      400,
      "Update newContent field is required and should not be empty! ! !"
    );

  //TODO: 8 check newContent differs from old content ? update : respond no changes
  if (commentExists.content !== newContent.trim()) {
    // console.log("~ DB comment details Update Operation initated~"); // comment.updatedAt = Date.now();

    commentExists.content = newContent;

    const updatedComment = await commentExists.save(
      { validateBeforeSave: false },
      { new: true }
    );

    if (!updatedComment)
      throw new ApiError(500, "Failed to save updated comment! ! !");

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedComment, "Comment updated succesfully!!!")
      );
  } else
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          null,
          "No changes in newContent provided to update comment!!!"
        )
      );
});

// TODO: The fn deletes the requested comment & its likes
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  //TODO: 1 check commentId
  if (isInvalidOrEmptyId(commentId))
    throw new ApiError(400, "Invalid comment id or not provided! ! !");

  //TODO: 2 find comment
  const commentExists = await Comment.findById(commentId).exec();

  if (!commentExists) {
    existsCheck(commentId, Comment, "deleteComment");
    throw new ApiError(404, "Comment not found! ! !");
  }

  //TODO: 3 check user is the owner of the comment
  if (commentExists.commentOwner?.toString() !== req.user?._id.toString())
    throw new ApiError(
      403,
      "You are not authorized to delete this comment! ! !"
    );

  //TODO: for util
  // const commentBelongsToExists = comment.video || comment.communityPost;
  // if (!commentBelongsToExists) {
  //   throw new ApiError(
  //     404,
  //     "Comment does not belong to a video or a community post! ! !-"
  //   );
  // }

  // if (comment.communityPost) {
  //   const communityPostExists = await CommunityPost.exists(
  //     comment.communityPost
  //   ).exec();
  //   if (!communityPostExists) {
  //     throw new ApiError(404, "Community post not found! ! !-");
  //   }
  // } else if (comment.video) {
  //   const video = await Video.findById(comment.video).exec();
  //   if (video) {
  //     if (!video.isPublished) {
  //       throw new ApiError(
  //         404,
  //         "Video is not yet published, Cannot delete comment! ! !"
  //       );
  //     }
  //   } else {
  //     throw new ApiError(404, "Video not found! ! !-");
  //   }
  // }

  //TODO: 4 delete comment
  const deletedComment = await commentExists.deleteOne().exec();

  if (!deletedComment.acknowledged && deletedComment.deletedCount === 0)
    throw new ApiError(500, "Failed to delete comment! ! !");

  //TODO: 5 delete comment likes after comment is deleted success
  const deletedCommentLikes = await Like.deleteMany({
    comment: new mongoose.Types.ObjectId(commentExists._id),
  });

  //Test code if want to return response as per deletedComment and deletedCommentLikes
  // if (
  //   (deletedCommentLikes &&
  //     deletedCommentLikes.acknowledged &&
  //     deletedCommentLikes.deletedCount === 0) ||
  //   !deletedCommentLikes
  // ) {
  //   return res
  //     .status(200)
  //     .json(
  //       new ApiResponse(
  //         200,
  //         { deletedComment, deletedCommentLikes },
  //         "Comment deleted succesfully!!!"
  //       )
  //     );
  // }

  return res
    .status(200)
    .json(
      new ApiResponse(200, null, "Comment deleted succesfully with likes!!!")
    );
});

export {
  addCommentOnVideo,
  addCommentOnCommunityPost,
  updateComment,
  deleteComment,
};
