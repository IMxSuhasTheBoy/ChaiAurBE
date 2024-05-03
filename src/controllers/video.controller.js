import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  destroyFileOnCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import {
  existsCheck,
  isInvalidOrEmptyId,
} from "../utils/validAndExistsCheck.js";

import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { User } from "../models/user.model.js";

//TODO: The fn fetches all videos according to query params
const getAllVideos = asyncHandler(async (req, res) => {
  const { query, sortBy, sortType, userId } = req.query;
  let { page = 1, limit = 10 } = req.query;

  //TODO: 1 Parse page and limit to numbers. Base 10 (decimal): The default base if the radix is not provided. Numbers are represented using digits 0-9.
  page = parseInt(page, 10);
  limit = parseInt(limit, 10);

  //TODO: 2 Set default values if query params are not provided
  page = Math.max(1, page); // page should be greater than 0 //ex: page is -1, it will be set to 1 / page is 3, it will be set to 3
  limit = Math.min(20, Math.max(1, limit)); // limit should be between 1 and 20 //ex: limit is 0, it will be set to 1 / limit is 50, it will be set to 20

  const pipeline = [];
  //  ! check refactore
  //TODO: 3 userId ? match videos according to checks for userId
  if (userId) {
    if (!userId) {
      throw new ApiError(400, "Invalid userId! ! !");
    }

    if (userId !== req.user?._id.toString()) {
      pipeline.push({
        $match: {
          isPublished: true,
          videoOwner: new mongoose.Types.ObjectId(userId),
        },
      });
      // console.log(": provided userId is not logged in user, published videos by provided userId(videoOwner) will be returnd");
    }

    if (userId === req.user?._id.toString()) {
      pipeline.push({
        $match: {
          videoOwner: new mongoose.Types.ObjectId(userId),
        },
      });
      // console.log(": provided userId is logged in user, all videos by provided userId(videoOwner) will be returnd");
    }
  } else {
    pipeline.push({
      $match: {
        isPublished: true,
      },
    });
    // console.log(": no userId provided, all published videos documents will be returned");
  }

  //TODO: 4 query ? try matching by field substring search
  if (query) {
    pipeline.push({
      $match: {
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ],
      },
    });
  }

  //TODO: 5 sort videos by sortBy and sortType if provided
  const sortCriteria = {};
  if (sortBy && sortType) {
    sortCriteria[sortBy] = sortType === "asc" ? 1 : -1;
    pipeline.push({
      $sort: sortCriteria,
    });
  } else {
    //*default sort by createdAt in descending order
    sortCriteria["createdAt"] = -1;
    pipeline.push({
      $sort: sortCriteria,
    });
  }

  // const options = {
  //   page: parseInt(page),
  //   limit: parseInt(limit),
  //   sort: sortBy
  //     ? { [sortBy]: sortType === "desc" ? -1 : 1 }
  //     : { createdAt: -1 },
  // };

  // add pagination using skip and limit
  // pipeline.push({
  //   $skip: (page - 1) * limit,
  // });
  // pipeline.push({
  //   $limit: limit,
  // });

  console.log(pipeline, " : pipeline");
  try {
    //TODO: 6 execute the aggregation pipeline
    const videos = await Video.aggregate(pipeline).exec();

    //TODO: 7 populate fields with documents count/documents
    for (let video of videos) {
      const likeCount = await Like.countDocuments({ video: video._id });
      video.likesCount = likeCount;
      // console.log(`Video ${video._id} has ${likeCount} likes`);
      const commentCount = await Comment.countDocuments({ video: video._id });
      video.commentCount = commentCount;

      const ownerDets = await User.findById(video.videoOwner).select(
        "fullName username"
      );
      video.videoOwner = ownerDets;

      // const likes = await Like.find({ video: video._id }).populate(
      //   "likedBy",
      //   "fullName username"
      // );
      // // video.likes = likes.map((like) => like.likedBy);
      // video.likesCount = likes.length;
    }

    const options = {
      page: 1,
      limit: 10,
    };
    // const videos = await Video.aggregatePaginate(pipeline, options);
    // console.log(videos.length, " : videos.length");
    // if (!videos) {
    //   throw new ApiError(500, "Error in fetching videos! ! !");
    // }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          videos,
          videos.length > 0
            ? "Videos fetched successfully!!!"
            : "No videos found!!!"
        )
      );
  } catch (error) {
    throw new ApiError(500, error?.message || "Error in fetching videos! ! !");
  }
});

//TODO: The fn creates a video - with title, description, videoFile, thumbnailFile, isPublished*
const publishAVideo = asyncHandler(async (req, res) => {
  //TODO✔ if any of videoFile or thumbnailFile is failed to upload cloud, throw error / delete cloud files of uploaded one of it
  const { title, description, isPublished = true } = req.body;
  // console.log("\n",req.files,"\n"," : req.files 1","\n",title,"\n",description,"\n",isPublished," : req.body" "\n");
  const videoFileLocalPath = req.files?.videoFile?.[0].path;
  const thumbnailFileLocalPath = req.files?.thumbnail?.[0].path;
  // console.log("\n",videoFileLocalPath,"\n",thumbnailFileLocalPath," : file paths \n");

  //TODO: 1 check title, description & files local path saved by middleware
  const isFieldEmpty = (field) => !field || field.trim() === ""; //?include undefined

  if (
    isFieldEmpty(title) ||
    isFieldEmpty(description) ||
    isFieldEmpty(videoFileLocalPath) ||
    isFieldEmpty(thumbnailFileLocalPath)
  )
    throw new ApiError(
      400,
      "All fields and files are required and should not be empty! ! !"
    );

  //TODO: 2 Files upload on cloud operations (all required fields are ready)
  const videoFile = await uploadOnCloudinary(
    videoFileLocalPath,
    "videos/videoFile"
  );

  //!Test videoFile = null;
  //TODO: 3 try uploading thumbnail on cloud after video upload success
  let thumbnailFile = undefined;
  if (!videoFile || isFieldEmpty(videoFile?.url)) {
    throw new ApiError(
      500,
      "Something went wrong while uploading videoFile! ! !"
    );
  } else {
    // console.log("video uploaded successfully try thumbnail upload!!!");
    thumbnailFile = await uploadOnCloudinary(
      thumbnailFileLocalPath,
      "videos/thumbnailFile"
    );
  } //TODO? make thumbnail upload operation repeats/retries itself till succeedes || some tries, if userr cancels process give below error*

  //!Test thumbnailFile = "";
  //TODO: 4 thumbnailFile failed to upload on cloud ? then destroy Uploaded cloud videoFile & throw error : move
  if (thumbnailFile === undefined || isFieldEmpty(thumbnailFile?.url)) {
    const videoFolderPath = "chaiaurbe/videos/video-files/";
    await destroyFileOnCloudinary(videoFolderPath, videoFile.url);

    throw new ApiError(500, "Something went wrong while uploading files! ! !");

    //?✔ Delete cloud uploaded video
  }

  //TODO: 5 create video (all required fields are ready)
  try {
    const video = await Video.create({
      title,
      description,
      videoFile: videoFile?.url,
      thumbnail: thumbnailFile?.url,
      duration: videoFile?.duration,
      videoOwner: req.user?._id,
      isPublished,
    });

    return res
      .status(201)
      .json(new ApiResponse(200, video, "Video published successfully!!!"));
  } catch (error) {
    throw new ApiError(500, "Something went wrong while publishing video! ! !");
  }
});

//TODO: The fn fetches video by videoId(only published) and populate likes and comments count and videoOwner field, updates views & watchHistory
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params; //can be whitespace / :videoId

  //TODO: 1 check videoId
  if (isInvalidOrEmptyId(videoId, ":videoId")) {
    throw new ApiError(400, "Invalid video id or not provided! ! !");
  }

  //TODO: 2 find video
  const video = await Video.findById(videoId)
    .populate({
      path: "videoOwner",
      select: " username",
      // select: "avatar fullName username",
    })
    .select("-__v -updatedAt");

  if (!video) {
    existsCheck(videoId, Video, "getVideoById"); //!experimental
    throw new ApiError(404, "Video not found! ! !");
  }
  if (!video?.isPublished) {
    throw new ApiError(404, "Video not found! ! ! !");
  }

  //try
  //TODO: 3 count of likes and comments
  const numberOfLikes = await Like.countDocuments({ video: video._id });
  const numberOfComments = await Comment.countDocuments({ video: video._id });

  //   if (
  //     !video ||
  //     (!video?.isPublished &&
  //       video?.videoOwner.toString() !== req.user?._id.toString()) //!Need to make changes as per strategy requirements, this strategy is for loggedin users having access to his videos
  //   ) {
  //     throw new ApiError(404, "Video not found! ! !");
  //   }

  //TODO: 4 update watch history of logged in user
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $addToSet: { watchHistory: video._id },
    },
    { new: true }
  );

  //TODO: 5 increment views of the video
  await Video.findByIdAndUpdate(
    video._id,
    {
      $inc: { views: 1 },
    },
    { new: true }
  );

  //TODO: 6 dynamically add numberOfLikes to the video object
  const videoWithNumberOfLikesAndComments = {
    ...video.toObject(),
    numberOfLikes: numberOfLikes,
    numberOfComments: numberOfComments,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        videoWithNumberOfLikesAndComments,
        "Video fetched successfully!!!"
      )
    );
  // } catch (error) {
  //   throw new ApiError(500, error?.message || "Error fetching the video! ! !");
  // }
  // });
});

//TODO: The fn updates video details title, description, thumbnail if atleast any one from it provided (only video owner can update details)
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params; //can be whitespace / :videoId

  //TODO: 1 check videoId
  if (isInvalidOrEmptyId(videoId, ":videoId"))
    throw new ApiError(400, "Invalid video id or not provided! ! !");

  //TODO: 2 find video
  const video = await Video.findById(videoId).exec();

  if (!video) {
    existsCheck(videoId, Video, "updateVideo"); //!experimental
    throw new ApiError(404, "Video not found! ! !");
  }

  //TODO: 3 check if the user is the owner of the video
  if (video?.videoOwner.toString() !== req.user?._id.toString())
    throw new ApiError(
      403,
      "You are not authorized to update details of this video! ! !"
    );

  //? try catch block not worked for my logic
  const { title, description } = req.body;
  const thumbnailLocalPath = req.file?.path; //undefined if not provided

  //!Most important checks to enter or not in DB updation operation if atleast any one is provided
  //TODO: 4 check provided new details
  if (
    (title && title.trim() !== "" && title.trim() !== video.title) ||
    (description &&
      description.trim() !== "" &&
      description.trim() !== video.description) ||
    thumbnailLocalPath !== undefined
  ) {
    // console.log("~ DB & cloud video details Update Operation initated~");

    if (title && title.trim() !== "") video.title = title.trim();

    if (description && description.trim() !== "")
      video.description = description.trim();

    //TODO: 4 Have old thumbnail access for 7
    const oldThumbnailUrl = video.thumbnail;
    const folderPath = "chaiaurbe/videos/thumbnails/";

    //TODO: 5 Upload new thumbnail if provided ? assign it : error
    let thumbnail = undefined; //will be new thumbnail if upload success remains else undefined
    if (thumbnailLocalPath !== undefined) {
      thumbnail = await uploadOnCloudinary(
        thumbnailLocalPath,
        "videos/thumbnailFile"
      );
      // console.log(thumbnail, ": thumbnail in TODO 5");

      if (!thumbnail.url || thumbnail.url === "") {
        // throw new ApiError(500, "Error in uploading thumbnail! ! !"); ///! try givivng error then decide for eeeror handling
      } else {
        video.thumbnail = thumbnail.url;
      }
    }
    // console.log(thumbnail, ": thumbnail out TODO 5");
    //TODO: 6 | till Step 5 all details are set to video if provided |, now save video details in DB
    const videoUpdated = await video.save(
      { validateBeforeSave: false },
      { new: true }
    );
    // console.log(videoUpdated, ": TODO 6 : videoUpdated");

    //TODO: 6 destroy old if cloud uploaded matches with DB updated ? destroy Old : move
    if (videoUpdated?.thumbnail === thumbnail?.url)
      await destroyFileOnCloudinary(folderPath, oldThumbnailUrl);

    return res
      .status(200)
      .json(
        new ApiResponse(200, video, "Video details updated successfully!!!")
      );
  } else {
    throw new ApiError(400, "No details provided to update video! ! !");
  }
});

//TODO: The fn deletes all docs related to requested video when requested video deletes successfully in this function by video owner
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params; //can be whitespace / :videoId

  //TODO: 1 check videoId
  if (isInvalidOrEmptyId(videoId, ":videoId"))
    throw new ApiError(400, "Invalid video id or not provided! ! !");

  let videoExists;
  let outerstatusCode = null;
  let outerErrorMsg = null;
  try {
    // TODO: 2 find video ? next check 3 : pass error to catch
    videoExists = await Video.findById(videoId).exec();
    if (!videoExists) {
      existsCheck(videoId, Video, "deleteVideo"); //!experimental
      outerstatusCode = 404;
      outerErrorMsg = "Video not found! ! !";
      // console.log(
      //   outerstatusCode,
      //   outerErrorMsg,
      //   ": outerstatusCode outerErrorMsg 2"
      // );
      throw new ApiError(outerstatusCode, outerErrorMsg);
    }

    //TODO: 3 check if the user is the owner of the video ? proceed delete : error
    if (videoExists.videoOwner.toString() !== req.user?._id.toString()) {
      outerstatusCode = 403;
      outerErrorMsg = "You are not authorized to delete this video! ! !";
      // console.log(
      //   outerstatusCode,
      //   outerErrorMsg,
      //   ": outerstatusCode outerErrorMsg 3"
      // );
      throw new ApiError(outerstatusCode, outerErrorMsg);
    }

    //TODO: 4 have old video files access for 7
    const oldVideo = videoExists.videoFile;
    const oldThumbnail = videoExists.thumbnail;
    const videoFolderPath = "chaiaurbe/videos/video-files/";
    const thumbnailFolderPath = "chaiaurbe/videos/thumbnails/";

    //TODO: 5 delete video
    const deletedVideo = await Video.deleteOne(videoExists._id).exec();
    console.log(deletedVideo, ":✔ deletedVideo-)");

    //TODO: 6 video deleted ? delete related docs : pass error to catch
    if (deletedVideo) {
      try {
        //6.1 delete all likes docs related to this video -> video field of likes document
        const deletedVideoLikes = await Like.deleteMany({
          video: new mongoose.Types.ObjectId(videoExists._id),
        }).exec();
        console.log(deletedVideoLikes, "✔: deletedVideoLikes-");

        //6.2 find all comments docs related to this video ->  video field of comments documents
        const commentsArray = await Comment.find({
          video: new mongoose.Types.ObjectId(videoExists._id),
        }).exec();
        console.log(commentsArray, ":✔ commentsArray");

        const deleteOperations = commentsArray.forEach(async (element) => {
          //6.3 delete all related like docs related to each comment doc -> comment field of like documents
          const deletedCommentLikes = await Like.deleteMany({
            comment: element._id,
          }).exec();
          console.log(deletedCommentLikes, ":✔ deletedCommentLikes-");

          //6.4 delete comments array -> if 6.2 && each comment likes delete success
          if (
            (deletedCommentLikes.acknowledged &&
              deletedCommentLikes.deletedCount === 0) ||
            (deletedCommentLikes.acknowledged &&
              deletedCommentLikes.deletedCount > 0)
          ) {
            const deletedCommentsArrayElems = await Comment.deleteMany({
              _id: element._id,
            }).exec();
            console.log(
              deletedCommentsArrayElems,
              ":✔ deletedCommentsArrayElems-"
            );
          }
        });
        // await Promise.all(deleteOperations); //Promise.all() : ?array of promises as an input and returns a single Promise that resolves when all of the input promises have resolved, or rejects as soon as one of the input promises rejects. It's commonly used when you have multiple asynchronous operations that can be executed concurrently and you want to wait for all of them to complete before proceeding with the next steps in your code.
        //TODO: 7 destroy old videoFile & thumbnail ✔
        await destroyFileOnCloudinary(videoFolderPath, oldVideo);
        await destroyFileOnCloudinary(thumbnailFolderPath, oldThumbnail);

        //TODO: 8 response of succesfull deletion of requested video doc & all related docs & files from cloud
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              null,
              "Video & related files deleted successfully!!!"
            )
          );
      } catch (error) {
        //?✔ if required : insted throwing error for related docs deletion just keep track of it & return response? pass err.msg to response if needed?
        console.log(
          error?.message,
          " : error trace of failed doc deletion in deleting related docs in deleteVideo! L ! O ! G !"
        );
        //TODO: 9 response of only requested video doc deletion successfull, (cause maybe some or all related doc deletion failure)
        return res
          .status(200)
          .json(new ApiResponse(200, null, "Video deleted successfully!!!"));
      }
    } else {
      throw new ApiError(500, "Failed to delete the video! ! !"); //?Test who is gona throw this only error of inner if-else?
      //purpose similar to above error handling process.exit(1);
    }
  } catch (error) {
    console.log(
      outerstatusCode,
      outerErrorMsg,
      ": outerstatusCode outerErrorMsg 4"
    );
    throw new ApiError(
      outerstatusCode === null ? 500 : outerstatusCode,
      outerErrorMsg === null
        ? error?.message ||
          "Error in finding video or authenticating the videoOwner with logged in user! ! !"
        : outerErrorMsg
    );
    //purpose similar to above error handling process.exit(1);
  }
});

//TODO: The fn toggles the publish status of the video by video owner
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params; //can be whitespace / :videoId

  //TODO: 1 check videoId
  if (isInvalidOrEmptyId(videoId, ":videoId"))
    throw new ApiError(400, "Invalid video id or not provided! ! !");

  //TODO: 2 find video
  const videoExists = await Video.findById(videoId)
    .select("videoOwner isPublished")
    .exec();

  if (!videoExists) {
    existsCheck(videoId, Video, "togglePublishStatus"); //!experimental
    throw new ApiError(404, "Video not found! ! !");
  }

  //TODO: 3 check if the user is the owner of the video
  if (videoExists.videoOwner.toString() !== req.user?._id.toString())
    throw new ApiError(
      403,
      "You are not authorized to update status of this video! ! !"
    );

  try {
    //TODO: 4 update video publish status
    videoExists.isPublished = !videoExists.isPublished;

    //TODO: 5 save video ? respond success : error to catch
    const videoExistsSave = await videoExists.save();

    if (!videoExistsSave)
      throw new ApiError(500, "Error in updating video publish status! ! !");

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          videoExists,
          "Video publish status updated successfully!!!"
        )
      );
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Error in updating video publish status! ! !"
    );
  }
});

export {
  getAllVideos,
  getVideoById,
  publishAVideo,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};

//!Experimental
/** async function uploadWithRetry(file) {
 try {
   const result = await uploadToCloudinary(file);
   return result;
  } catch (error) {
    console.error('Upload failed, retrying...');
    return uploadWithRetry(file); // Recursive call to retry upload
  }
}

async function uploadToCloudinary(file) {
  // Code to upload file to Cloudinary asynchronously
}

// To initiate the upload operation with retry
const file = 'your_file_to_upload';
uploadWithRetry(file)
.then(result => {
  console.log('Upload successful:', result);
})
.catch(error => {
  console.error('Max retries reached, upload failed:', error);
});
*/

//---------------------------------------------------------
/* 
//TODO: 3 Files upload on cloud operations
const videoFile = await uploadOnCloudinary(
  videoFileLocalPath,
  "videos/videoFile"
);
// let thumbnailFile = undefined;
// if (!videoFile && videoFile?.url === "") {
  //   throw new ApiError(
    //     500,
    //     "Something went wrong while uploading videoFile! ! !"
    //   );
    // } else {
      //   console.log("video upload successfully!!!");
      //   thumbnailFile = await uploadOnCloudinary(
        //     thumbnailFileLocalPath,
        //     "videos/thumbnailFile"
        //   );
        // } //? make thumbnail upload operation repeats/retries itself till succeedes || some tries 
        // Strategy for error (both required case) : When videoFile succeeds ? try thumbnailFile : error, when thumbnailFile succeeds ? move to video creation : error✔. || destroy succeded one if any one fails (repeat till both succeedes to move create video) || keep succeded one at cloud till both succeed via retry by client, if client fails/exits/cancels process to publish-> then destroy succeded one. || try upload thumbnail after video created && optionaly upload a temporary thumbnail*
        // // or make thumbnailFile optional if not provided. || not required
        */

//!Experimental
