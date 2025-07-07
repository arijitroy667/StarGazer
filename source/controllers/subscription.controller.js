import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const channelObjId = new mongoose.Types.ObjectId(channelId);
  const userObjId = new mongoose.Types.ObjectId(userId);

  const channel = await Subscription.findOne({
    channel: channelObjId,
    subscriber: userObjId,
  });

  if (channel) {
    // If the subscription exists, delete it to unsubscribe
    const result = await Subscription.deleteOne({
      channel: channelObjId,
      subscriber: userObjId,
    });

    if (result.deletedCount === 0) {
      throw new ApiError(404, "Subscription not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Unsubscribed successfully"));
  } else {
    const newSubscription = await Subscription.create({
      channel: channelObjId,
      subscriber: userObjId,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, newSubscription, "Subscribed successfully"));
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  const subscribers = await Subscription.aggregate([
    {
      $match: { channel: new mongoose.Types.ObjectId(channelId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriberDetails",
      },
    },
    { $unwind: "$subscriberDetails" },
    { $replaceRoot: { newRoot: "$subscriberDetails" } },
    {
      $project: {
        _id: 0,
        username: 1,
        fullName: 1,
        avatar: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribers,
        "Subscribers list retrieved successfully"
      )
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber ID");
  }

  const channels = await Subscription.aggregate([
    {
      $match: { subscriber: new mongoose.Types.ObjectId(subscriberId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channelDetails",
      },
    },
    { $unwind: "$channelDetails" },
    { $replaceRoot: { newRoot: "$channelDetails" } },
    {
      $project: {
        _id: 0,
        username: 1,
        fullName: 1,
        avatar: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channels,
        "Channel Subscriptions retrieved successfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
