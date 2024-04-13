import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  destroyFileOnCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";

//TODO: Get all videos based on query, sort, pagination , test is to be done yet using anyones userId to fetch their videos
const getAllVideos = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  //TODO: 1 Parse page and limit to numbers. Base 10 (decimal): The default base if the radix is not provided. Numbers are represented using digits 0-9.
  page = parseInt(page, 10);
  limit = parseInt(limit, 10);

  //TODO: 2 Set default values if query params are not provided
  page = Math.max(1, page); // page should be greater than 0 //ex: page is -1, it will be set to 1 / page is 3, it will be set to 3
  limit = Math.min(20, Math.max(1, limit)); // limit should be between 1 and 20 //ex: limit is 0, it will be set to 1 / limit is 50, it will be set to 20

  const pipeline = []; //TODO: 3 - Structure pipeline based on below checks & query params

  // match videos by owner userId if provided
  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid userId");
    }

    pipeline.push({
      $match: {
        videoOwner: new mongoose.Types.ObjectId(userId),
      },
    });
  } //ex: [{'$match': { videoOwner: new ObjectId('660d44370718ff71f2fd8163') }},{ '$sort': { createdAt: -1 } },{ '$skip': 0 },{ '$limit': 10 }]

  // match videos by query if provided
  if (query && query.trim() !== "") {
    pipeline.push({
      $match: {
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ], //looks for substring present in title/description field of the document case-insensessive operation
      },
    });
  }

  // sort videos by sortBy and sortType if provided
  const sortCriteria = {};
  if (sortBy && sortType) {
    sortCriteria[sortBy] = sortType === "asc" ? 1 : -1;
    pipeline.push({
      $sort: sortCriteria,
    });
  } else {
    // default sort by createdAt in descending order
    sortCriteria["createdAt"] = -1;
    pipeline.push({
      $sort: sortCriteria,
    });
  }

  // add pagination using skip and limit
  pipeline.push({
    $skip: (page - 1) * limit,
  });
  pipeline.push({
    $limit: limit,
  });

  // console.log("pipeline", pipeline, "pipeline");

  /** // execute the aggregatePaginate pipeline returns { "statusCode": 200, "data": { "docs":[ {}, {}, {} ] }, "details":  .... }
  Video.aggregatePaginate(pipeline)
    .then((result) => {
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Videos fetched successfully!!!"));
    })
    .catch((error) => {
      throw new ApiError(
        500,
        error?.message || "Error in fetching videos! ! !"
      );
    });
  */
  //TODO: 4 execute the aggregation pipeline
  try {
    const videos = await Video.aggregate(pipeline).exec();
    // console.log(videos, " : videos");

    if (!videos) {
      throw new ApiError(500, "Error in fetching videos! ! !");
    } //mmore checks may require for aggregation result failure

    //TODO: 5
    return res
      .status(200)
      .json(new ApiResponse(200, videos, "Videos fetched successfully!!!"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Error in fetching videos! ! !");
  }
});

//TODO: Publish a video title, description, isPublished, videoFile, thumbnailFile
const publishAVideo = asyncHandler(async (req, res) => {
  //TODO✔ if any of videoFile or thumbnailFile is failed to upload cloud, throw error / delete cloud files of uploaded one of it
  //TODO: 1
  const { title, description, isPublished = true } = req.body;
  // console.log("\n",req.files,"\n"," : req.files 1","\n",title,"\n",description,"\n",isPublished," : req.body" "\n");
  //TODO: 2
  const videoFileLocalPath = req.files?.videoFile?.[0].path;
  const thumbnailFileLocalPath = req.files?.thumbnail?.[0].path;
  // console.log("\n",videoFileLocalPath,"\n",thumbnailFileLocalPath," : paths 2 \n");

  //made fn to check is string/property type string empty ?
  const isFieldEmpty = (field) => !field || field.trim() === "";
  if (
    isFieldEmpty(title) ||
    isFieldEmpty(description) ||
    isFieldEmpty(videoFileLocalPath) ||
    isFieldEmpty(thumbnailFileLocalPath)
  ) {
    throw new ApiError(
      400,
      "All fields and files are required and should not be empty! ! !"
    );
  }

  //TODO: 3 Files upload on cloud operations (all required fields are ready)
  const videoFile = await uploadOnCloudinary(
    videoFileLocalPath,
    "videos/videoFile"
  );

  //!Test videoFile = null;
  //TODO: 4 try thumbnail cloud upload after succesfull video upload
  let thumbnailFile = undefined;
  if (!videoFile && isFieldEmpty(videoFile?.url)) {
    throw new ApiError(
      500,
      "Something went wrong while uploading videoFile! ! !"
    );
  } else {
    // console.log("video upload successfully try thumbnail upload!!!");
    thumbnailFile = await uploadOnCloudinary(
      thumbnailFileLocalPath,
      "videos/thumbnailFile"
    );
  } //TODO? make thumbnail upload operation repeats/retries itself till succeedes || some tries, if userr cancels process give below error*

  //!Test thumbnailFile = "";
  //TODO: 5 thumbnailFile failed to upload on cloud ? then destroy Uploaded cloud videoFile & throw error : move
  if (thumbnailFile === undefined || isFieldEmpty(thumbnailFile?.url)) {
    const videoFolderPath = "chaiaurbe/videos/video-files/";
    await destroyFileOnCloudinary(videoFolderPath, videoFile.url);

    throw new ApiError(500, "Something went wrong while uploading files! ! !");

    //?✔ Delete cloud uploaded video
  }

  //TODO: 6 create video in DB (all required fields are ready)
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
    //TODO: 7 return response with created document
    return res
      .status(201)
      .json(new ApiResponse(200, video, "Video published successfully!!!"));
  } catch (error) {
    throw new ApiError(500, "Something went wrong while publishing video! ! !");
  }
});

const getVideoById = asyncHandler(async (req, res) => {
  //TODO: 1 //? checks of this fn should be according to purpose of this fn(clearly defined later maybe), OR WEB-APP may require another similar fn for another similar access control
  const { videoId } = req.params;
  if (!isValidObjectId(videoId) || videoId.trim() === "" || !videoId) {
    throw new ApiError(400, "Invalid video id or not provided! ! !");
  }

  //TODO: 2
  try {
    const video = await Video.findById(videoId).exec();

    if (
      !video ||
      (!video?.isPublished &&
        video?.videoOwner.toString() !== req.user?._id.toString()) //!Need to make changes as per strategy requirements, this strategy is for loggedin users having access to his videos
    ) {
      throw new ApiError(404, "Video not found! ! !");
    }

    //TODO: 3
    return res
      .status(200)
      .json(new ApiResponse(200, video, "Video fetched successfully!!!"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Error fetching the video! ! !");
  }
});

//TODO: update video details title, description, thumbnail if atleast any one from it provided
const updateVideo = asyncHandler(async (req, res) => {
  //TODO: 1
  const { videoId } = req.params;

  if (!isValidObjectId(videoId) || videoId.trim() === "" || !videoId) {
    throw new ApiError(400, "Invalid video id or not provided! ! !");
  }

  const video = await Video.findById(videoId).exec();
  // console.log(video, ": video");

  if (!video) {
    throw new ApiError(404, "Video not found! ! !");
  }

  //TODO: 2 check if the user is the owner of the video
  if (video?.videoOwner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to update details of this video! ! !"
    );
  }
  //? try catch block not worked for my logic
  //TODO: 3 set new details to video & thumbnail if provided
  const { title, description } = req.body;
  const thumbnailLocalPath = req.file?.path; //undefined if not provided
  // console.log(thumbnailLocalPath, ": thumbnailLocalPath");

  //!Most important checks to enter or not in DB updation operation if atleast any one is provided
  if (
    (title && title.trim() !== "") ||
    (description && description.trim() !== "") ||
    thumbnailLocalPath !== undefined
  ) {
    console.log("~ DB & cloud video details Update Operation initated~");
    if (title && title.trim() !== "") {
      video.title = title;
    }
    if (description && description.trim() !== "") {
      video.description = description;
    }

    //TODO: 4 Have old thumbnail access
    const oldThumbnailUrl = video.thumbnail;
    const folderPath = "chaiaurbe/videos/thumbnails/";

    //TODO: 5 Upload new thumbnail if provided ? assign it  : error
    let thumbnail = undefined; //will be new thumbnail if upload success remains else undefined
    if (thumbnailLocalPath !== undefined) {
      thumbnail = await uploadOnCloudinary(
        thumbnailLocalPath,
        "videos/thumbnailFile"
      );
      // console.log(thumbnail, ": thumbnail in TODO 5");

      if (!thumbnail.url && thumbnail.url === "") {
        throw new ApiError(500, "Error in uploading thumbnail! ! !"); ///! try givivng error then decide for eeeror handling
      } else {
        video.thumbnail = thumbnail.url;
      }
    }
    // console.log(thumbnail, ": thumbnail out TODO 5");
    //TODO: 6 | till Step 5 all details are set to video if provided |, now save video details in DB
    const updatedVideo = await video.save(
      { validateBeforeSave: false },
      { new: true }
    );
    // console.log(updatedVideo, ": TODO 6 : updatedVideo");

    //TODO: 7 destroy old if cloud uploaded matches with DB updated ? destroy Old : move
    if (updatedVideo?.thumbnail === thumbnail?.url) {
      await destroyFileOnCloudinary(folderPath, oldThumbnailUrl);
    }
    //TODO: 8 return response
    return res
      .status(200)
      .json(
        new ApiResponse(200, video, "Video details updated successfully!!!")
      );
  } else {
    throw new ApiError(400, "No details provided to update! ! !");
  }
});

//!mplement code to delete all docs of from all related video-likes✔ & comments+comment-like {when video delete success}.

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId) || videoId.trim() === "" || !videoId) {
    throw new ApiError(400, "Invalid video id or not provided! ! !");
  }

  let video;
  let outerstatusCode = null;
  let outerErrorMsg = null;
  try {
    video = await Video.findById(videoId).exec();
    if (!video) {
      outerstatusCode = 404;
      outerErrorMsg = "Video not found! ! !";
      console.log(
        outerstatusCode,
        outerErrorMsg,
        ": outerstatusCode outerErrorMsg 2"
      );
      throw new ApiError(outerstatusCode, outerErrorMsg);
    }

    if (video.videoOwner.toString() !== req.user?._id.toString()) {
      outerstatusCode = 403;
      outerErrorMsg = "You are not authorized to delete this video! ! !";
      console.log(
        outerstatusCode,
        outerErrorMsg,
        ": outerstatusCode outerErrorMsg 3"
      );
      throw new ApiError(outerstatusCode, outerErrorMsg);
    }

    const oldVideo = video.videoFile;
    const oldThumbnail = video.thumbnail;
    const videoFolderPath = "chaiaurbe/videos/video-files/";
    const thumbnailFolderPath = "chaiaurbe/videos/thumbnails/";

    const isVideoDeleted = await Video.deleteOne(video._id).exec();
    console.log(isVideoDeleted, ":✔ isVideoDeleted-)");
    if (isVideoDeleted) {
      try {
        //TODO: ALL RELATED DOC DELETE OPERATIONS after video deleted will be here & !mplement tracing errors of deletions failures in try catch block

        //TODO: delete all likes documents related to this videoId matching video field in likes document
        const deletedVideoLikes = await Like.deleteMany({
          video: new mongoose.Types.ObjectId(video._id),
        }).exec();
        console.log(deletedVideoLikes, "✔: deletedVideoLikes-");

        //TODO: find all comments related to this video -> videoId matching video field in comments documents
        const commentsArray = await Comment.find({
          video: new mongoose.Types.ObjectId(video._id),
        }).exec();
        console.log(commentsArray, ":✔ commentsArray");

        //TODO: delete all related like documents related to each comment document
        const deleteOperations = commentsArray.forEach(async (element) => {
          const deletedCommentLikes = await Like.deleteMany({
            comment: element._id,
          }).exec();
          console.log(deletedCommentLikes, ":✔ deletedCommentLikes-");

          //TODO: delete comments array related to this videoId
          const deletedCommentsArrayElems = await Comment.deleteMany({
            _id: element._id,
          }).exec();
          console.log(
            deletedCommentsArrayElems,
            ":✔ deletedCommentsArrayElems-"
          );
        });
        // await Promise.all(deleteOperations); //Promise.all() : ?array of promises as an input and returns a single Promise that resolves when all of the input promises have resolved, or rejects as soon as one of the input promises rejects. It's commonly used when you have multiple asynchronous operations that can be executed concurrently and you want to wait for all of them to complete before proceeding with the next steps in your code.

        // console.log(deleteOperations, ": deleteOperations");

        //TODO: (already did in above map) delete comments array related to this videoId
        // const commentsArrayElementsDeleted = await Comment.deleteMany({
        //   video: new mongoose.Types.ObjectId(videoId),
        // });

        //TODO: destroy videoFile & thumbnail ✔
        await destroyFileOnCloudinary(videoFolderPath, oldVideo);
        await destroyFileOnCloudinary(thumbnailFolderPath, oldThumbnail);

        //TODO: response of succesfull deletion of video doc , all video related docs & files of cloud
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              isVideoDeleted,
              "Video & related files deleted successfully!!!"
            )
          );
      } catch (error) {
        //?✔ insted throwing error for related docs deletion just keep track of it & return response? pass err.msg to response if needed?
        console.log(
          error?.message,
          " : error trace of failed doc deletion in deleting related docs in deleteVideo! L ! O ! G !"
        );
        //TODO: response of only video doc deletion successfull. (cause maybe some or all related doc deletion failure)
        return res
          .status(200)
          .json(
            new ApiResponse(
              200,
              isVideoDeleted,
              "Video deleted successfully!!!"
            )
          );
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

const togglePublishStatus = asyncHandler(async (req, res) => {
  //TODO: 1
  const { videoId } = req.params;

  if (!isValidObjectId(videoId) || videoId.trim() === "" || !videoId) {
    throw new ApiError(400, "Invalid video id or not provided! ! !");
  }

  try {
    //TODO: 2
    const video = await Video.findById(videoId)
      .select("videoOwner isPublished")
      .exec();

    if (!video) {
      throw new ApiError(404, "Video not found! ! !");
    }

    // check if the user is the owner of the video
    if (video?.videoOwner.toString() !== req.user?._id.toString()) {
      throw new ApiError(
        403,
        "You are not authorized to update status of this video! ! !"
      );
    }

    //TODO: 3
    video.isPublished = !video.isPublished;

    await video.save();
    //TODO: 4
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          video,
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
  publishAVideo,
  getVideoById,
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
