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
  const { videoId } = req.params; //can be whitespace / :videoId

  //TODO: 1 check videoId
  if (isInvalidOrEmptyId(videoId, ":videoId"))
    throw new ApiError(400, "Invalid video id or not provided! ! !");

  //TODO: 2 find video
  const videoExists = await Video.findById(videoId).exec();

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
  const { communityPostId } = req.params; //can be whitespace / :communityPostId

  //TODO: 1 check communityPostId
  if (isInvalidOrEmptyId(communityPostId, ":communityPostId"))
    throw new ApiError(400, "Invalid community post id or not provided! ! !");

  //TODO: 2 check communityPost exists ? {_id} : null
  const communityPostExistsId = await CommunityPost.exists({
    _id: communityPostId,
  });

  if (!communityPostExistsId._id) {
    existsCheck(communityPostId, CommunityPost, "toggleCommunityPostLike"); //!experimental
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
  const { commentId } = req.params; //can be whitespace / :commentId

  //TODO: 1 check commentId
  if (isInvalidOrEmptyId(commentId, ":commentId"))
    throw new ApiError(400, "Invalid comment id or not provided! ! !");

  //TODO: 2 check comment exists ? {_id} : null
  const commentExistsId = await Comment.exists({
    _id: commentId,
  });

  if (!commentExistsId._id) {
    existsCheck(commentId, Comment, "toggleCommentLike"); //!experimental
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

//TODO: The fn used to return liked videos list of logged in user (returns videos that are at published stage by videoOwner) (when video goes at unpublished state: the liked documents of video are still preserved)
const getLikedVideos = asyncHandler(async (req, res) => {
  const aggregateLikedVideos = Like.aggregate([
    {
      // [ {like doc}, {}...] the liked docs for videos which all are liked by logged in user
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      // [ {like doc, "likedVideoDoc":[{video doc}] }, {}...] new field added "likedVideoDoc" into like doc and project only the required fields from it
      $lookup: {
        from: "videos",
        let: { videoId: "$video" }, //$video field from like doc (it's ObjectId of video)
        //!mplement✔   filter out unpublished videos
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", "$$videoId"] },
              isPublished: true,
            },
          },
          {
            $project: {
              title: 1,
              duration: 1,
              views: 1,
              videoOwner: 1,
              thumbnail: 1,
              createdAt: 1,
            },
          },
        ],
        as: "likedVideoDoc",
      },
    },
    {
      // [ {like doc, "likedVideoDoc":{video doc} }, {}...] merged {video doc} the field "likedVideoDoc" with like doc
      $unwind: "$likedVideoDoc",
    },
    {
      // [ {like doc, "likedVideos":{video doc}, "videoOwnerDoc":[{user doc}] }, {}...] new field "videoOwnerDoc" added into like doc and project only the required fields from it
      $lookup: {
        from: "users",
        let: { videoOwner_id: "$likedVideoDoc.videoOwner" }, //$likedVideoDoc.videoOwner field from like doc (it's ObjectId of user)

        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", "$$videoOwner_id"] },
            },
          },
          {
            $project: {
              _id: 0, //likeDoc id is not required
              username: 1,
              avatar: 1,
              // fullName: 1,
            },
          },
        ],
        as: "videoOwnerDoc",
      },
    },
    {
      // [ {like doc, "likedVideoDoc":{video doc}, "videoOwnerDoc":{user doc} }, {}...]  merged {user doc} the field "videoOwnerDoc" with like doc
      $unwind: { path: "$videoOwnerDoc", preserveNullAndEmptyArrays: true },
    },
    {
      //TODO: project only the required fields custom field names too (the like._id overwrited with likedVideoDoc._id)
      $project: {
        // likedBy: 1,
        _id: "$likedVideoDoc._id",
        title: "$likedVideoDoc.title",
        thumbnail: "$likedVideoDoc.thumbnail",
        duration: "$likedVideoDoc.duration",
        views: "$likedVideoDoc.views",
        createdAt: "$likedVideoDoc.createdAt",
        videoOwnerDetails: {
          username: "$videoOwnerDoc.username",
          avatar: "$videoOwnerDoc.avatar",
          // fullName: "$videoOwner.fullName",
        },
      },
    },
  ]);
  const options = {
    page: 1,
    limit: 10,
  };

  // console.log(aggregateLikedVideos, " : aggregateLikedVideos");
  try {
    Like.aggregatePaginate(aggregateLikedVideos, options)
      .then(function (likedVideos) {
        // console.log(likedVideos);
        console.log(likedVideos.docs.length, " : likedVideos length");
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              likedVideos,
              likedVideos.docs.length > 0
                ? "Liked videos fetched successfully!!!"
                : "No liked videos found!!!"
            )
          );
      })
      .catch(function (error) {
        // console.log(error);
        throw new ApiError(
          500,
          error?.message || `Error in fetching liked videos! ! !`
        );
      });
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

/* 
//!experimental  another way
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
          {
            $project: {
              title: 1,
              duration: 1,
              views: 1,
              videoOwner: 1,
              thumbnail: 1,
              createdAt: 1,
            },
          },
        ],
        as: "likedVideoDoc",
      },
    };

    const unwindStage1 = {
      $unwind: "$likedVideoDoc",
    };

    const lookupStage2 = {
      $lookup: {
        from: "users",
        let: { videoOwner_id: "$likedVideoDoc.videoOwner" }, 
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", "$$videoOwner_id"] },
            },
          },
          {
            $project: {
              _id: 0, //likeDoc id is not required
              username: 1,
              avatar: 1,
              // fullName: 1,
            },
          },
        ],
        as: "videoOwnerDoc",
      },
    };

    const unwindStage2 = {
      $unwind: { path: "$videoOwnerDoc", preserveNullAndEmptyArrays: true },
    };

    const projectStage = {
      $project: {
        // likedBy: 1,
        _id: "$likedVideoDoc._id",
        title: "$likedVideoDoc.title",
        thumbnail: "$likedVideoDoc.thumbnail",
        duration: "$likedVideoDoc.duration",
        views: "$likedVideoDoc.views",
        createdAt: "$likedVideoDoc.createdAt",
        videoOwnerDetails: {
          username: "$videoOwnerDoc.username",
          avatar: "$videoOwnerDoc.avatar",
          // fullName: "$videoOwner.fullName",
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



*/
