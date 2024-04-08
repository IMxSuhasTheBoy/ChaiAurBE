import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//? allow subscription feature only if any(his) video have videoOwner field of that user, So that user as channel,( by adding a isChannel boolean field in User model using aggrigation addField )
//? have another similar access control with a createChannel fn for user to create a channel & allow feature of subscription
const toggleSubscription = asyncHandler(async (req, res) => {
  //TODO: 1
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

// controller to return subscriber list of a channel : GET all that docs where channel: channelId = then u got subscribers count the channelId has by picking up each subscriber field from that docs get who has subscribed
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
