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

//? insted of handling comment operations individualy for video, communityPost...maybe more additions in future, Can we make comment handling controller that can handle operations for any of the passed id.
const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all video comments only for now .. then try to make it work for communityPost also...
  let { videoId } = req.params;
  let { page = 1, limit = 10 } = req.query;

  //TODO: 1 Parse page and limit to numbers. Base 10 (decimal): The default base if the radix is not provided. Numbers are represented using digits 0-9.
  page = parseInt(page, 10);
  limit = parseInt(limit, 10);

  //TODO: 2 Set default values if query params are not valid or not provided
  page = Math.max(1, page); // page should be greater than 0 //ex: page is -1, it will be set to 1 / page is 3, it will be set to 3
  limit = Math.min(20, Math.max(1, limit)); // limit should be between 1 and 20 //ex: limit is 0, it will be set to 1 / limit is 50, it will be set to 20

  if (!isValidObjectId(videoId) || videoId.trim() === "" || !videoId) {
    throw new ApiError(400, "Invalid video id or not provided! ! !");
    //check for video owner match with logged in user isnt required
  }

  const video = await Video.findById(videoId).exec(); //?if call operation failing

  if (!video) {
    //call util
    throw new ApiError(404, "Video not found! ! !");
  }
  if (!video.isPublished) {
    throw new ApiError(
      404,
      "Video is not yet published, Cannot get comments for this video! ! !"
    );
  }

  const options = {
    page,
    limit,
    sort: { createdAt: -1 },
  };
  try {
    const commentsQuery = Comment.aggregate([
      {
        $match: {
          video: new mongoose.Types.ObjectId(video?._id),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "commentOwner",
          foreignField: "_id",
          as: "commentOwner",
        },
      },
      {
        $unwind: "$commentOwner",
      },
      {
        $project: {
          _id: 1,
          content: 1,
          createdAt: 1,
          commentOwner: {
            _id: 1,
            // fullName: 1,
            username: 1,
            // avatar: 1,
          },
        },
      },
      {
        $lookup: {
          from: "likes",
          let: { commentId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$comment", "$$commentId"],
                },
              },
            },
            {
              $project: {
                _id: 1,
                likedBy: 1,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "likedBy",
                foreignField: "_id",
                as: "likedBy",
              },
            },
            { $unwind: "$likedBy" },
            {
              $project: {
                _id: 0,
                likedBy: {
                  _id: 1,
                  // fullName: 1,
                  username: 1,
                  // avatar: 1,
                },
              },
            },
          ],
          as: "likes",
        },
      },
      {
        $addFields: {
          commentLikesCount: { $size: "$likes" },
        },
      },
    ]);

    const comments = await Comment.aggregatePaginate(commentsQuery, options);

    if (comments?.length < 1) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            videoId: video._id,
            videoCommentsCount: comments.length,
          },
          "No comments found for this video!!!"
        )
      );
    }
    console.log("must not enter........");
    return res.status(200).json(
      new ApiResponse(
        200,
        // video,
        // { videoId: video._id, videoCommentsCount: comments.length, comments },
        comments,
        "Comments of video fetched succesfully!!!"
      )
    );
  } catch (error) {
    throw new ApiError(500, error?.message || "Error fetching comments! ! !");
  }
});

///!testing  required adjust as per req.
const getCommunityPostComments = asyncHandler(async (req, res) => {
  //TODO: get all video comments only for now .. then try to make it work for communityPost also...
  let { communityPostId } = req.params;
  let { page = 1, limit = 10 } = req.query;

  //TODO: 1 Parse page and limit to numbers. Base 10 (decimal): The default base if the radix is not provided. Numbers are represented using digits 0-9.
  page = parseInt(page, 10);
  limit = parseInt(limit, 10);

  //TODO: 2 Set default values if query params are not valid or not provided
  page = Math.max(1, page); // page should be greater than 0 //ex: page is -1, it will be set to 1 / page is 3, it will be set to 3
  limit = Math.min(20, Math.max(1, limit)); // limit should be between 1 and 20 //ex: limit is 0, it will be set to 1 / limit is 50, it will be set to 20

  if (isInvalidOrEmptyId(communityPostId)) {
    throw new ApiError(400, "Invalid community post id or not provided! ! !");
    //check for communityPost owner match with logged in user isnt required
  }
  const communityPost = await CommunityPost.findById(communityPostId).exec(); //?if call operation failing

  if (!communityPost) {
    //call util
    throw new ApiError(404, "Community post not found! ! !");
  }
  const options = {
    page,
    limit,
    sort: { createdAt: -1 },
  };
  try {
    const commentsQuery = Comment.aggregate([
      {
        $match: {
          communityPost: new mongoose.Types.ObjectId(communityPost?._id),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "commentOwner",
          foreignField: "_id",
          as: "commentOwner",
        },
      },
      {
        $unwind: "$commentOwner",
      },
      {
        $project: {
          _id: 1, //comment-id
          content: 1, //comment-content
          createdAt: 1, //comment-details
          commentOwner: {
            //direct addition of new field in core Obj
            _id: 1,
            // fullName: 1,
            username: 1,
            // avatar: 1,
          },
        },
      },
      {
        $lookup: {
          from: "likes",
          let: { commentId: "$_id" }, // comment-id from core Obj projection
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$comment", "$$commentId"], //finding for multiple like docs, [like-field, var comment-id as value] for lookup
                },
              },
            },
            {
              $project: {
                //got like docs
                _id: 1,
                likedBy: 1, //user details projection if needed
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "likedBy",
                foreignField: "_id",
                as: "likedBy",
              },
            },
            { $unwind: "$likedBy" },
            {
              $project: {
                _id: 0, //its probably of like doc
                likedBy: {
                  _id: 1, //user details projection
                  // fullName: 1,
                  username: 1,
                  // avatar: 1,
                },
              },
            },
          ],
          as: "likes",
        },
      },
      {
        //maybe its added on core Obj
        $addFields: {
          commentLikesCount: { $size: "$likes" },
        },
      },
    ]);
    const comments = await Comment.aggregatePaginate(commentsQuery, options);

    if (comments?.length < 1) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            communityPostId: communityPost._id,
            communityPostCommentsCount: comments.length,
          },
          "No comments found for this community post!!!"
        )
      );
    }
    console.log("must not enter........");
    return res.status(200).json(
      new ApiResponse(
        200,
        // video,
        // { videoId: video._id, videoCommentsCount: comments.length, comments },
        comments,
        "Comments of community post fetched succesfully!!!"
      )
    );
  } catch (error) {
    throw new ApiError(500, error?.message || "Error fetching comments! ! !");
  }
  ///
  //
  //
});

// TODO: The fn adds a new comment on a video by the logged in user, the video must be published: true
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

// TODO: The fn adds a new comment on a communityPost by the logged in user
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

// TODO: The fn updates the requested comment only when new content provided in the request body, by the logged in comment owner
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

// TODO: The fn deletes the requested comment & its likes by the logged in comment owner
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
  getVideoComments,
  addCommentOnCommunityPost,
  getCommunityPostComments,
  updateComment,
  deleteComment,
};

// async function findDocumentByObjectId(models) {
//   console.log(documentId, " : query");
//   if (!mongoose.isValidObjectId(documentId)) {
//     throw new ApiError(400, "Invalid video id");
//   }

//   for (const Model of models) {
//     const doc = await Model.findById(documentId).exec();

//     if (doc) {
//       return doc;
//     }
//   }

//   return null;
// }
// const models = [Video, CommunityPost];
// const document = await findDocumentByObjectId(models);
// console.log(document, " : document");

//!experimental

//!AGGREGATION PAGINATION comments & commentLikes
// const commentsArray = await Comment.find({
//   video: new mongoose.Types.ObjectId(documentId),
// });
// console.log(commentsArray, " : commentsArray");

// const findOperations = commentsArray.forEach(async (element) => {
//   const commentLikesArray = await Like.find({
//     comment: element._id,
//   });
//   console.log(commentLikesArray, element._id, ": commentLikesArray");
/// });

/// const comments = await Comment.aggregate([
//   {
//     $match: {
//       video: new mongoose.Types.ObjectId(documentId),
//     },
//   },
//   {
//     $lookup: {
//       from: "users",
//       localField: "commentOwner",
//       foreignField: "_id",
//       as: "commentOwner",
//     },
//   },
//   {
//     $lookup: {
//       from: "likes",
//       localField: "_id",
//       foreignField: "comment",
//       as: "likes",
//     },
//   },
//   {
//     $unwind: "$commentOwner",
//   },
//   {
//     $project: {
//       _id: 1,
//       content: 1,
//       createdAt: 1,
//       commentOwner: {
//         _id: 1,
//         username: 1,
//         avatar: 1,
//       },
//       likesCount: {
//         $size: "$likes",
//       },
//     },
//   },
// ]);

// const addComment = asyncHandler(async (req, res) => {
//   const { documentId, parentId } = req.params;
//   console.log(documentId, parentId, "Req.params");

//   if (!isValidObjectId(documentId) || documentId.trim() === "" || !documentId) {
//     throw new ApiError(400, "Invalid video id or not provided! ! !");
//   }
//   const videoExists = await Video.findOne({ _id: documentId });

//   const errorMessage = !videoExists
//     ? "Video does not exist! ! !"
//     : !videoExists.isPublished
//       ? "Video is not yet published, Cannot comment on a video which is not published! ! !"
//       : null;

//   if (errorMessage) {
//     throw new ApiError(404, errorMessage);
//   }

//   const { content } = req.body;

//   const isFieldEmpty = (field) => !field || field.trim() === "";

//   if (isFieldEmpty(content)) {
//     throw new ApiError(
//       400,
//       "content field for comment is required and should not be empty! ! !"
//     );
//   }

//   try {
//     const document = await Comment.create({
//       content: content,
//       commentOwner: req.user?._id,
//       video: videoExists._id,
//     });

//     return res
//       .status(201)
//       .json(new ApiResponse(200, document, "Comment added successfully!!!"));
//   } catch (error) {
//     throw new ApiError(500, error?.message || "Error in creating comment! ! !");
//   }
// });
//!experimental

//!updateComment todo:
// 1 Extract the commentId from the request parameters.
// 2 Check if the commentId is a valid object ID and not empty. If not, throw an error.
// 3 Find the comment with the given commentId.
// 4 If the comment does not exist, throw an error.
// 5 Check if the current user is the owner of the comment. If not, throw an authorization error.
// 6 Check if the comment belongs to either a video or a community post. If not, throw an error.
// 7 If the comment belongs to a community post, check if the community post exists.
// 8 If the comment belongs to a video, check if the video exists and is published.
// 9 Update the content of the comment with the new content from the request body.
// 10 Save the updated comment with validation disabled and get the updated comment.
// 11 If the update is successful, return a success response with the updated comment.
// 12 If no content is provided to update the comment, throw an error.
//!updateComment todo:
