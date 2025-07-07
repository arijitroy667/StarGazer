import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

  const userId = req.user._id;
  if (!userId) {
    throw new ApiError(400, "User ID is required for channel stats");
  }

  const totalVideos = await Video.countDocuments({ owner: userId });
  const totalSubscribers = await Subscription.countDocuments({
    channel: userId,
  });
  const totalLikes = await Like.countDocuments({ likeBy: userId });
  const totalViewsResult = await Video.aggregate([
    {
      $match: { owner: new mongoose.Types.ObjectId(userId) },
    },
    {
      $group: {
        _id: null,
        totalViews: { $sum: "$views" },
      },
    },
  ]);

  if (!totalViewsResult) {
    throw new ApiError(404, "Total views not found for the channel");
  }

  const totalViews = totalViewsResult[0]?.totalViews || 0;

  if (
    totalVideos === null ||
    totalSubscribers === null ||
    totalLikes === null ||
    totalViews === null
  ) {
    throw new ApiError(404, "Channel stats not found");
  }

  const channelStats = {
    totalVideos,
    totalSubscribers,
    totalLikes,
    totalViews,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, channelStats, "Channel stats retrieved successfully")
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const userId = req.user._id;
  if (!userId) {
    throw new ApiError(400, "User ID is required for video retrieval");
  }

  const { page = 1, limit = 10 } = req.query;

  const allVideos = await Video.find({ owner: userId })
    .sort({ createdAt: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  return res
    .status(200)
    .json(new ApiResponse(200, allVideos, "Videos retrieved successfully"));
});

export { getChannelStats, getChannelVideos };
