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

// The fn either adds a new like or removes an existing like only when the video exists && published: true
const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (isInvalidOrEmptyId(videoId))
    throw new ApiError(400, "Invalid video id or not provided! ! !");

  const videoExists = await Video.findOne({ _id: videoId });

  if (!videoExists) existsCheck(videoId, Video, "toggleVideoLike"); //!experimental

  const errorMessage = !videoExists
    ? "Video does not exist! ! !"
    : !videoExists.isPublished
      ? "Video is not yet published, Cannot like a video which is not published! ! !"
      : null;

  if (errorMessage) throw new ApiError(404, errorMessage);

  const credentials = { video: videoExists._id, likedBy: req.user?._id };

  try {
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

// The fn either adds a new like or removes an existing like only when the communityPost exists
const toggleCommunityPostLike = asyncHandler(async (req, res) => {
  const { communityPostId } = req.params;

  if (isInvalidOrEmptyId(communityPostId))
    throw new ApiError(400, "Invalid community post id or not provided! ! !");

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

// The fn either adds a new like or removes an existing like only when the comment exists
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (isInvalidOrEmptyId(commentId))
    throw new ApiError(400, "Invalid comment id or not provided! ! !");

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

//TODO: Only logged in users can get their liked videos list(only videos that are published by videoOwner):Test case from video.controller:- 4 user fetches getLikedVideos 4!imlement✔ only returns liked videos thier field isPublished: true (behind the scenes: the liked documents are still preserved even video is unpublished)
//? is  it required to delete video here that are found here not exists? at match stage maybe?
const getLikedVideos = asyncHandler(async (req, res) => {
  console.log(req.user._id.toString(), "req.user._id getLikedVideos");
  //!mplement aggregationPagination varient
  try {
    const likedVideos = await Like.aggregate([
      {
        // [ {like doc}, {}...] the liked videos which are liked by the logged in user
        $match: {
          likedBy: new mongoose.Types.ObjectId(req.user?._id),
        },
      },
      {
        // [ {like doc, "likedVideos":[{video doc}] }, {}...] new field("likedVideos") with like doc
        $lookup: {
          from: "videos",
          let: { videoId: "$video" },
          //!mplement✔ filteration for unpublished videos
          // [ {like doc, "likedVideos":[{video doc(filtered)}] }, {}...] filtered out videos which are not published
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$videoId"] },
                isPublished: true,
              },
            },
          ],
          as: "likedVideos",
        },
      },
      {
        // [ {like doc, "likedVideos":{video doc} }, {}...] merged {video doc} the field "likedVideos" with like doc
        $unwind: "$likedVideos",
      },
      {
        // [ {like doc, "likedVideos":{video doc}, "videoOwner":[{user doc}] }, {}...] new field("videoOwner") with like doc, project only the required fields from it using pipeline
        $lookup: {
          from: "users",
          let: { videoOwner_id: "$likedVideos.videoOwner" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$videoOwner_id"] },
              },
            },
            {
              $project: {
                _id: 0,
                username: 1,
                // avatar: 1,
                fullName: 1,
              },
            },
          ],
          as: "videoOwner",
        },
      },
      {
        // [ {like doc, "likedVideos":{video doc}, "videoOwner":{user doc} }, {}...]  merged {user doc} the field "videoOwner" with like doc
        $unwind: { path: "$videoOwner", preserveNullAndEmptyArrays: true },
      },
      {
        // project only the required fields from it using custom field names too (overriden the like._id with "likedVideos._id")
        $project: {
          // likedBy: 1,
          _id: "$likedVideos._id",
          title: "$likedVideos.title",
          // thumbnail: "$likedVideos.thumbnail",
          duration: "$likedVideos.duration",
          views: "$likedVideos.views",
          videoOwnerDetails: {
            username: "$videoOwner.username",
            // avatar: "$videoOwner.avatar",
            fullName: "$videoOwner.fullName",
          },
        },
      },

      // {
      //   $replaceRoot: { newRoot: "$likedVideos" },
      // },
    ]);

    //?another way
    const matchStage = {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
      },
    };

    const lookupStage1 = {
      $lookup: {
        from: "videos",
        let: { videoId: "$video" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", "$$videoId"] },
              isPublished: true,
            },
          },
        ],
        as: "likedVideos",
      },
    };

    const unwindStage1 = {
      $unwind: "$likedVideos",
    };

    const lookupStage2 = {
      $lookup: {
        from: "users",
        let: { videoOwner_id: "$likedVideos.videoOwner" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", "$$videoOwner_id"] },
            },
          },
          {
            $project: {
              _id: 0,
              username: 1,
              fullName: 1,
            },
          },
        ],
        as: "videoOwner",
      },
    };

    const unwindStage2 = {
      $unwind: { path: "$videoOwner", preserveNullAndEmptyArrays: true },
    };

    const projectStage = {
      $project: {
        _id: "$likedVideos._id",
        title: "$likedVideos.title",
        duration: "$likedVideos.duration",
        views: "$likedVideos.views",
        videoOwner: {
          username: "$videoOwner.username",
          fullName: "$videoOwner.fullName",
        },
      },
    };

    const groupStage = {
      $group: {
        _id: null,
        likedVideos: { $push: "$$ROOT" },
      },
    };

    const projectFinalStage = {
      $project: {
        _id: 0,
        likedVideos: {
          $arrayToObject: {
            $map: {
              input: "$likedVideos",
              as: "likedVideo",
              in: {
                k: { $toString: "$$likedVideo._id" },
                v: {
                  _id: "$$likedVideo._id",
                  title: "$$likedVideo.title",
                  duration: "$$likedVideo.duration",
                  views: "$$likedVideo.views",
                  videoOwnerDetails: "$$likedVideo.videoOwner",
                },
              },
            },
          },
        },
      },
    };

    const replaceRootStage = {
      $replaceRoot: {
        newRoot: "$likedVideos",
      },
    };

    const refactoredPipeline = [
      matchStage,
      lookupStage1,
      unwindStage1,
      lookupStage2,
      unwindStage2,
      projectStage,
      groupStage,
      projectFinalStage,
      replaceRootStage,
    ];

    // const likedVideos = await Like.aggregate(refactoredPipeline);

    if (!likedVideos) {
      throw new ApiError(500, "Error in fetching liked videos! ! !");
    } //! mmore checks may require for aggregation result failure

    const likedVideosCount = likedVideos.length;

    console.log(likedVideos, " : likedVideos");
    // console.log(likedVideos[0].likedVideos," : likedVideos[0].likedVideos [{}, {},...]");
    return res.status(200).json(
      new ApiResponse(
        200,
        likedVideos,
        // {
        //   likedVideosCount,
        //   // likedVideos: likedVideos[0]?.likedVideos,
        //   likedVideos,
        // },
        "Liked videos fetched successfully!!!"
      )
    );
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Error in fetching liked videos! ! !"
    );
  }
});

export {
  toggleCommentLike,
  toggleCommunityPostLike,
  toggleVideoLike,
  getLikedVideos,
};
