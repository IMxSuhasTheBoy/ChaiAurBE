import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  destroyFileOnCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

//TODO: Get all videos based on query, sort, pagination
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
    console.log(videos, " : videos");

    if (!videos) {
      throw new ApiError(500, "Error in fetching videos! ! !");
    }

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
      "All fields and files are required and should not be empty.! ! !"
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

    //?Delete cloud uploaded video
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


export {
  getAllVideos,
  publishAVideo,
  getVideoById,
 
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
