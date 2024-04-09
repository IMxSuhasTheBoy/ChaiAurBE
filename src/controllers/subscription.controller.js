import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//? allow subscription feature only if any(his) video have videoOwner field of that user, So that user as channel,( by adding a isChannel boolean field in User model using aggrigation addField )
//? have another similar access control with a createChannel fn for user to create a channel & allow feature of subscription
const toggleSubscription = asyncHandler(async (req, res) => {
  //TODO: 1 get channelId whose user wants to toggle subscription.
  const { channelId } = req.params;

  if (!channelId) {
    throw new ApiError(400, "Channel ID is required! ! !");
  } else if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid Channel ID! ! !");
  }

  //TODO: 2 logged in user is trying to subscribe to himself ? error : move
  const userId = req.user?._id;

  if (userId.toString() === channelId) {
    throw new ApiError(403, "You cannot subscribe to your channel! ! !");
  }

  const credentials = { subscriber: userId, channel: channelId };

  //TODO: 3 if userId already subscribed to this channelId It will be deleted ? return response with 200 : add subscription document
  try {
    //CASE (subcription returns document):  doc exists- doc will be deleted
    //CASE (subcription returns null):  doc does not exist- new subscription doc will be created
    const subscriptionExists = await Subscription.findOneAndDelete(credentials);
    // console.log("subscription : ", subscriptionExists, ": subscription");

    if (!subscriptionExists) {
      const newSubscription = await Subscription.create(credentials);

      if (!newSubscription) {
        throw new ApiError(500, "Error in adding subscription! ! !");
      }

      return res
        .status(201)
        .json(
          new ApiResponse(
            200,
            newSubscription,
            "User subscribed the channel successfully!!!"
          )
        );
    }
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          subscriptionExists,
          "User unsubscribed the channel successfully!!!"
        )
      );
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Error in toggling subscription! ! !"
    );
  }
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  //TODO: 1 user who wants to get his subscribers list
  const { channelId } = req.params;
  const userId = req.user?._id.toString();

  if (!channelId) {
    throw new ApiError(400, "Channel ID is required! ! !");
  } else if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid Channel ID! ! !");
  }

  //?Strategy addition: userId equals channelId ? give subscribers details list, count : give count.  (addition depends upon usage need)
  if (userId !== channelId) {
    throw new ApiError(
      403,
      "You cannot view subscribers of others channel! ! !"
    );
  }

  //TODO: 2 get channel subscribers [documents] whose channel field matches channelId -> extract subscriber field from that documents
  try {
    const channelSubscribers = await Subscription.aggregate([
      {
        $match: {
          channel: new mongoose.Types.ObjectId(channelId),
        },
      },
      {
        $lookup: {
          from: "users", // collection name to be joined
          localField: "subscriber", // field(subscriber is ObjectId) of the current(subscription)document.
          foreignField: "_id", // field(_id is ObjectId) in the "users" collection to match with subscriber(localField)
          as: "subscriber", // name of the array field in the current document to store the result(localField overrides/new field)
        },
      },
      {
        $unwind: "$subscriber", // array field (subscriber) is unwound to get only _id and username
      },
      {
        $group: {
          _id: "$subscriber._id",
          username: { $first: "$subscriber.username" },
          email: { $first: "$subscriber.email" },
        },
      },
      // {
      //   $project: {
      //     _id: 0,
      //     subscriber: {
      //       _id: 1,
      //       username: 1,
      //     },
      //   },
      // },
    ]);

    // console.log("\n subscriptions  : ", subscriptions, " : subscriptions \n");

    //TODO: 3 return res
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          channelId,
          subscribersCount: channelSubscribers.length,
          subscriberDetails: channelSubscribers,
        },
        "Channel subscribers fetched successfully!!!"
      )
    );
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Error in fetching channel subscribers! ! !"
    );
  }
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  //TODO: 1 user who wants to get subscribed channels list
  const { subscriberId } = req.params;

  const userId = req.user?._id.toString();

  if (!subscriberId) {
    throw new ApiError(400, "Subscriber ID is required! ! !");
  } else if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid Subscriber ID! ! !");
  }

  if (userId !== subscriberId) {
    throw new ApiError(
      403,
      "You cannot view subscribed channels of others! ! !"
    );
  }

  //TODO: 2 get subscribed channels [documents] whose subscriber field matches subscriberId -> extract channel field from that documents
  try {
    const subscribedChannels = await Subscription.aggregate([
      {
        $match: {
          subscriber: new mongoose.Types.ObjectId(subscriberId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "channel", // field(channel is ObjectId) of the current(subscription)document.
          foreignField: "_id", // field(_id is ObjectId) in the "users" collection to match with channel(localField ObjectId)
          as: "channel", //results
        },
      },
      {
        $unwind: "$channel",
      },
      {
        $group: {
          _id: "$channel._id",
          username: { $first: "$channel.username" },
          email: { $first: "$channel.email" },
        },
      },
      // {
      //   $project: {
      //     _id: 1,
      //     channel: {
      //       _id: 1,
      //       username: 1,
      //     },
      //   },
      // },
    ]);
    // console.log("\n subscriptions 2 : ", subscribedChannels, " : subscriptions 2");

    //TODO: 3 return res
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          subscriberId,
          subscribedChannelsCount: subscribedChannels.length,
          channelDetails: subscribedChannels,
        },

        "Subscribed channels fetched successfully!!!"
      )
    );
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Error in fetching subscribed channels! ! !"
    );
  }
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };


//!experimental
// console.log(
//   "\n-\n",
//   await User.aggregate([
//     {
//       $match: {
//         _id: new mongoose.Types.ObjectId(req.user._id),
//       },
//     },
//   ]),
//   "\n-\n"
// );

/*
  const subscriptionsTest = await Subscription.find({
    channel: channelId,
  }).populate({
    path: "subscriber",
    select: "username email _id",
  });
  const subscribersArray = subscriptionsTest.map(
    (subscription) => subscription.subscriber
  );

  const subscriptionsTest = await Subscription.find({
  subscriber: subscriberId,
  }).populate({
    path: "channel",
    select: "username email",
  });
  const channelsArray = subscriptionsTest.map(
    (subscription) => subscription.channel
  );
*/

/*
const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  for (let i = 0; i < maxRetries; i++) {
    try {
  
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new ApiError(
          500,
          error?.message || "Error in fetching subscribers! ! !"
        );
      } else {
        console.log(`Retrying in ${retryDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }
  */

//!experimental