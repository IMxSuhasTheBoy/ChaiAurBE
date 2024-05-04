import mongoose from "mongoose";
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

import { Playlist } from "../models/playlist.model.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";

//TODO: The fn creates Playlist all fields taken from form data
const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  console.log(!name, description);

  //TODO: 1 check name, file and upload it
  if (!name || name.trim() === "")
    throw new ApiError(400, "Playlist name is required! ! !");

  const playlistThumbnailLocalPath = req.file?.path;
  console.log(playlistThumbnailLocalPath, " : playlistThumbnailLocalPath");

  let thumbnail;
  if (playlistThumbnailLocalPath) {
    thumbnail = await uploadOnCloudinary(
      playlistThumbnailLocalPath,
      "playlists/thumbnail"
    );
  }

  //?set playlist thumbnail as thumbnail from 1st available video of that playlist

  //TODO: 2 create playlist with thumbanail or default thumbnail
  const playlist = await Playlist.create({
    name,
    description: description || "",
    playlistOwner: req.user?._id,
    thumbnail:
      thumbnail?.url ||
      "http://res.cloudinary.com/dxmhivqtq/image/upload/v1714389465/chaiaurbe/playlists/defaultPlaylistThumbnail-1714389464841-313443645.jpg",
  });
  // console.log(playlist, " : playlist");

  //TODO: create playlist
  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        playlist,
        playlist.thumbnail ===
        "http://res.cloudinary.com/dxmhivqtq/image/upload/v1714389465/chaiaurbe/playlists/defaultPlaylistThumbnail-1714389464841-313443645.jpg"
          ? "Playlist created successfully, Default thumbnail used !!!"
          : "Playlist created successfully!!!"
      )
    );
});

//TODO: The fn returns all playlists created by provided userId. //?how can i do sorting on frontend only?
const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params; // can be whitespaces / :userId
  // console.log(userId, " : userId");

  //TODO: 1 user id differs from logged in user? check( user exists? exec pipeline : error) : exec pipeline
  if (userId !== req.user?._id.toString()) {
    if (isInvalidOrEmptyId(userId, ":userId"))
      throw new ApiError(400, "Invalid User Id! ! !");

    //find user
    const userExistsId = await User.exists(new mongoose.Types.ObjectId(userId));

    if (!userExistsId._id) throw new ApiError(400, "User not found! ! !");
    // console.log(userExistsId, " : userExistsId");
  }

  //TODO: 2 define pipeline
  const playlists = Playlist.aggregate([
    {
      //got all playlists docs
      $match: {
        playlistOwner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      //left join video collection according to video ids present in playlist.videos
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos", //overwriting videos array in playlist doc with video docs for each video ids
      },
    },
    {
      //additional informative field
      //todo: userId is same as logged in user ? count videos : count only published videos(filterd)
      $addFields: {
        videosCount: {
          $cond: {
            if: {
              $eq: [userId, req.user?._id.toString()],
            },
            then: {
              $size: "$videos",
            },
            else: {
              $size: {
                $filter: {
                  input: "$videos",
                  as: "video",
                  cond: { $eq: ["$$video.isPublished", true] },
                },
              },
            },
          },
        },
      },
    },
    {
      $project: {
        name: 1,
        _id: 1,
        createdAt: 1,
        // videos: 1, //for testing
        videosCount: 1,
        playlistOwner: 1,
      },
    },
  ]);

  const options = {
    page: 1,
    limit: 10,
    sort: { createdAt: -1 }, //only sort at backend: default sort by createdAt in descending order
  };

  Playlist.aggregatePaginate(playlists, options)
    .then(function (playlists) {
      // console.log(playlists);
      console.log(playlists.docs.length, " : playlists length");
      return res
        .status(200)
        .json(
          new ApiResponse(200, playlists, "Playlists fetched successfully!!!")
        );
    })
    .catch(function (error) {
      // console.log(error);
      throw new ApiError(
        500,
        error?.message || `Error in fetching playlists! ! !`
      );
    });
});

//TODO: The fn returns playlist by id with its videos, and if the logged in user is the owner of the fetched playlist, it includes all videos (published and unpublished). If not, it includes only published videos.
const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  //TODO: 1 check id
  if (isInvalidOrEmptyId(playlistId, ":playlistId")) {
    throw new ApiError(400, "Invalid playlist Id! ! !");
  }

  //todo✔ video filter implemented before mapping projection of videos doc as per isPublished status
  //todo✔ show all videos in fetched playlist if fetched playlist owner === current user then:{}
  //todo✔ show only published videos in fetched playlist if fetched playlist owner !== current user else:{}
  try {
    const playlist = await Playlist.aggregate([
      {
        //got playlist doc
        $match: {
          _id: new mongoose.Types.ObjectId(playlistId),
        },
      },
      {
        //left join video collection according to video ids present in playlist.videos
        $lookup: {
          from: "videos",
          localField: "videos",
          foreignField: "_id",
          as: "videos", //overwriting videos array in playlist doc with video docs for each video ids
        },
      },
      {
        //additional informative fields
        $addFields: {
          videosCount: {
            publishedVideos: {
              $size: {
                $filter: {
                  input: "$videos",
                  as: "video",
                  cond: { $eq: ["$$video.isPublished", true] },
                },
              },
            },
            unpublishedVideos: {
              $size: {
                $filter: {
                  input: "$videos",
                  as: "video",
                  cond: { $eq: ["$$video.isPublished", false] },
                },
              },
            },
            totalVideos: {
              $size: "$videos",
            },
          },
        },
      },
      {
        //playlist fields projection, videos:[{video doc}, {}...]  mapped projection
        $project: {
          name: 1,
          thumbnail: 1,
          description: 1,
          playlistOwner: 1,
          videosCount: 1,
          //check : playlistOwner === logged in user?  then:{} unfiltered : else:{} filtered
          videos: {
            $cond: {
              if: {
                $eq: ["$playlistOwner", req.user?._id],
              },
              then: {
                $map: {
                  input: "$videos", //!Here loggedin user fetching his playlist in videos[] shows all vids. (published & also unpublished) : so make change in projection fields as per potential requirements
                  as: "video",
                  in: {
                    _id: "$$video._id",
                    title: "$$video.title",
                    thumbnail: "$$video.thumbnail",
                    duration: "$$video.duration",
                    isPublished: "$$video.isPublished",
                    views: "$$video.views",
                    createdAt: "$$video.createdAt",
                  },
                },
              },
              else: {
                $map: {
                  input: {
                    $filter: {
                      input: "$videos",
                      as: "video",
                      cond: { $eq: ["$$video.isPublished", true] },
                    },
                  },
                  as: "video",
                  in: {
                    _id: "$$video._id",
                    title: "$$video.title",
                    thumbnail: "$$video.thumbnail",
                    duration: "$$video.duration",
                    isPublished: "$$video.isPublished",
                    views: "$$video.views",
                    createdAt: "$$video.createdAt",
                  },
                },
              },
            },
          },
        },
      },
    ]);
    // console.log(playlist, " : playlist aggregate");
    // console.log(playlist[0].videos.length, " : playlist aggregate length");

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          playlist,
          "Playlist details fetched successfully!!!"
        )
      );
  } catch (error) {
    throw new ApiError(500, error?.message || "Failed to fetch playlist! ! !");
  }
});


//TODO: The fn updates playlist name, description and thumbnail if any of updation fields/file provided
const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  const playlistThumbnailLocalPath = req.file?.path;
  console.log(playlistThumbnailLocalPath, " : playlistThumbnailLocalPath");

  if (isInvalidOrEmptyId(playlistId, ":playlistId"))
    throw new ApiError(400, "Invalid Playlist Id! ! !");

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    existsCheck(playlistId, Playlist, "addVideoToPlaylist"); //!experimental
    throw new ApiError(404, "Playlist not found! ! !");
  } else if (playlist.playlistOwner.toString() !== req.user?._id.toString())
    throw new ApiError(
      403,
      "You are not authorized to update this playlist! ! !"
    );

  if (
    (name && name.trim() !== "" && name.trim() !== playlist.name) ||
    (description &&
      description.trim() !== "" &&
      description.trim() !== playlist.description) ||
    playlistThumbnailLocalPath !== undefined
  ) {
    // console.log("~ DB & cloud playlist details Update Operation initated~");

    if (name) playlist.name = name.trim();

    if (description) playlist.description = description.trim();

    //TODO: 4 Have old thumbnail access for 7
    let oldThumbnailUrl = playlist.thumbnail;
    const folderPath = "chaiaurbe/playlists/playlist-thumbnails/";

    //TODO: 5 Upload new thumbnail if provided ? assign it : error
    let thumbnail = undefined; //will be new thumbnail if upload success else remains undefined
    if (playlistThumbnailLocalPath !== undefined) {
      thumbnail = await uploadOnCloudinary(
        playlistThumbnailLocalPath,
        "playlists/thumbnail"
      );
      console.log(thumbnail, ": thumbnail in TODO 5");

      if (!thumbnail.url || thumbnail.url === "") {
        // throw new ApiError(500, "Error in uploading thumbnail! ! !"); ///! try givivng error then decide for eeeror handling
      } else {
        playlist.thumbnail = thumbnail.url;
      }
    }
    console.log(thumbnail, ": thumbnail out TODO 5");
    //TODO: 6 | till Step 5 all details are set to video if provided |, now save video details in DB
    const playlistUpdated = await playlist.save(
      { validateBeforeSave: false },
      { new: true }
    );
    console.log(playlistUpdated, ": TODO 6 : playlistUpdated");

    //TODO: 7 destroy old if cloud uploaded matches with DB updated & not default? destroy Old : move
    if (
      oldThumbnailUrl !==
        "http://res.cloudinary.com/dxmhivqtq/image/upload/v1714389465/chaiaurbe/playlists/defaultPlaylistThumbnail-1714389464841-313443645.jpg" &&
      playlistUpdated?.thumbnail === thumbnail?.url
    ) {
      await destroyFileOnCloudinary(folderPath, oldThumbnailUrl);
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          playlist,
          "Playlist details updated successfully!!!"
        )
      );
  } else {
    throw new ApiError(400, "No details provided to update playlist! ! !");
  }
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  updatePlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
};

/*
//!experimental
 const playlist = await Playlist.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(playlistId),
        },
      },

      {
        $lookup: {
          from: "videos",
          localField: "videos",
          foreignField: "_id",
          as: "videos",
        },
      },

      { 
      $project: {
        name: 1,
        description: 1,
        playlistOwner: 1,
        videos: {
          $map: {
            input: "$videos",
            as: "video",
            in: {
              $cond: {
                if: { $eq: ["$$video.isPublished", true] },
                then: {
                  _id: "$$video._id",
                  title: "$$video.title",
                  thumbnail: "$$video.thumbnail",
                  duration: "$$video.duration",
                  isPublished: "$$video.isPublished",
                },
                else: { isPublished: "$$video.isPublished" },
              },
            },
          },
        },
      },
    },
    ]);
*/
