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
import { CommunityPost } from "../models/communityPost.model.js";

//TODO: The fn creates CommunityPost
const createCommunityPost = asyncHandler(async (req, res) => {
  const { content } = req.body;

  //TODO: 1 check content
  if (!content || content.trim() === "")
    throw new ApiError(
      400,
      "Content field for community post is required and should not be empty! ! !"
    );

  try {
    //TODO: 2 create community post
    // content = content.trim();
    const communityPost = await CommunityPost.create({
      content: content.trim(),
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

// TODO: The fn used to return CommunityPosts list of logged in user/requested userId from params if provided
const getAllCommunityPosts = asyncHandler(async (req, res) => {
  const { userId } = req.query; // can be "" / whitespaces / undefined

  //TODO: 1 check userId if provided
  let matchUserId = req.user?._id.toString();
  if (userId !== undefined) {
    if (!isValidObjectId(userId))
      throw new ApiError(400, "Invalid userId! ! !");

    if (userId !== req.user?._id.toString()) matchUserId = userId;
  }

  //TODO: 2 aggregate community posts by logged in user/requested userId
  const aggregateCommunityPosts = CommunityPost.aggregate([
    {
      // getting community post list
      $match: {
        communityPostOwner: new mongoose.Types.ObjectId(matchUserId),
      },
    },
    {
      // getting user doc from communityPostOwner field
      $lookup: {
        from: "users",
        let: { userId: "$communityPostOwner" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", "$$userId"] },
            },
          },
          {
            $project: {
              _id: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
        as: "communityPostOwner",
      },
    },
    {
      $unwind: "$communityPostOwner",
    },
    {
      $graphLookup: {
        from: "likes",
        startWith: "$_id",
        connectFromField: "_id",
        connectToField: "communityPost",
        as: "likes",
        depthField: "depth",
      },
    },
    {
      $project: {
        _id: 1,
        content: 1,
        communityPostOwner: 1,
        commentsCount: 1,
        createdAt: 1,
        updatedAt: 1,
        __v: 1,
        communityPostOwner: 1,
        likesCount: { $size: "$likes" },
      },
    },
  ]);

  console.log(aggregateCommunityPosts, " : aggregateCommunityPosts");
  const options = {
    page: 1,
    limit: 10,
  };

  //TODO: 3 paginate community posts
  CommunityPost.aggregatePaginate(aggregateCommunityPosts, options)
    .then(function (communityPosts) {
      console.log(communityPosts, " : communityPosts");
      return res
        .status(200)
        .json(new ApiResponse(200, communityPosts, "fetched successfully"));
    })
    .catch(function (error) {
      // console.log(error);
      throw new ApiError(
        500,
        error?.message || `Error in fetching liked videos! ! !`
      );
    });
});

//TODO: The fn updates the requested CommunityPost only when new content provided in the request body, by the logged in community post owner
const updateCommunityPost = asyncHandler(async (req, res) => {
  const { communityPostId } = req.params; //can be whitespaces / :communityPostId

  //TODO: 1 check communityPostId
  if (isInvalidOrEmptyId(communityPostId, "communityPostId"))
    throw new ApiError(400, "Invalid communityPostId or not provided! ! !");

  //TODO: 2 find community post
  const communityPost = await CommunityPost.findById(communityPostId).exec();
  // console.log(communityPost, " : communityPost");
  if (!communityPost) {
    existsCheck(communityPostId, CommunityPost, "updateCommunityPost"); //!experimental
    throw new ApiError(404, "Community post not found! ! !");
  }

  //TODO: 3 check user is the owner of the community post
  if (communityPost?.communityPostOwner.toString() !== req.user?._id.toString())
    throw new ApiError(
      403,
      "You are not authorized to update this community post! ! !"
    );

  const { newContent } = req.body;

  //TODO: 4 check newContent
  if (!newContent || newContent.trim() === "")
    throw new ApiError(
      400,
      "Update newContent field is required and should not be empty! ! !"
    );

  //TODO: 5 check newContent differs from old content ? update : respond no changes
  if (communityPost.content !== newContent) {
    // console.log("~ DB communityPost details Update Operation initated~");
    communityPost.content = newContent.trim();
    const updatedCommunityPost = await communityPost.save(
      { validateBeforeSave: false },
      { new: true }
    );

    if (!updatedCommunityPost)
      throw new ApiError(500, "Failed to save updated community post! ! !");

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

//TODO: This fn deletes all docs related to requested community post when requested community post deletes successfully in this function by community post owner
const deleteCommunityPost = asyncHandler(async (req, res) => {
  const { communityPostId } = req.params; //can be whitespaces / :communityPostId

  //TODO: 1 check communityPostId
  if (isInvalidOrEmptyId(communityPostId, "communityPostId"))
    throw new ApiError(400, "Invalid communityPostId or not provided! ! !");

  //TODO: 2 find community post
  const communityPost = await CommunityPost.findById(communityPostId).exec();

  if (!communityPost) {
    existsCheck(communityPostId, CommunityPost, "deleteCommunityPost"); //!experimental
    throw new ApiError(404, "Community post not found! ! !");
  }

  //TODO: 3 check user is the owner of the community post
  if (
    communityPost?.communityPostOwner?.toString() !== req.user?._id.toString()
  )
    throw new ApiError(
      403,
      "You are not authorized to delete this community post! ! !"
    );

  //TODO: 4 delete community post ? try deleting related docs : error
  const deletedCommunityPost = await communityPost.deleteOne().exec();
  console.log(deletedCommunityPost, ": deletedCommunityPost-");

  if (
    !deletedCommunityPost.acknowledged &&
    deletedCommunityPost.deletedCount === 0
  )
    throw new ApiError(500, "Failed to delete community post! ! !");

  try {
    //cp likes delete
    const deletedLikes = await Like.deleteMany({
      communityPost: new mongoose.Types.ObjectId(communityPost._id),
    });
    console.log(deletedLikes, ": deletedCPLikes-");

    //comments find
    const comments = await Comment.find({
      communityPost: new mongoose.Types.ObjectId(communityPost._id),
    });

    // each comment likes delete & comment delete when likes delete success
    const deleteOperations = comments.forEach(async (element) => {
      const deletedCommentLikes = await Like.deleteMany({
        comment: element._id,
      });
      console.log(deletedCommentLikes, ": deletedCommentLikes-");

      if (
        (deletedCommentLikes.acknowledged &&
          deletedCommentLikes.deletedCount === 0) ||
        (deletedCommentLikes.acknowledged &&
          deletedCommentLikes.deletedCount > 0)
      ) {
        const deletedEachElemFromComments = await Comment.deleteMany({
          _id: element._id,
        }).exec();
        console.log(
          deletedEachElemFromComments,
          ": deletedEachElemFromComments-"
        );
      }
    });
  } catch (error) {
    console.error(error?.message);
  }
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
  getAllCommunityPosts,
  updateCommunityPost,
  deleteCommunityPost,
};

/*
//!Experimental
  {
      $lookup: {
        from: "comments",
        let: { communityPostId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$communityPost", "$$communityPostId"],
              },
            },
          },
          {
            $count: "count",
          },
        ],
        as: "commentsCount",
      },
    },
    {
      $unwind: {
        path: "$commentsCount",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        commentsCount: { $ifNull: ["$commentsCount.count", 0] },
      },
    },

    const aggregateCommunityPosts = await CommunityPost.aggregate([
      {
      // getting community post list
      $group: {
        _id: "$communityPostOwner",
      },
    },
  ]);
  console.log(aggregateCommunityPosts, " : aggregateCommunityPosts");
  */
