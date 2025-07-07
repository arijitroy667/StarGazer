import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const userId = req.user._id;
  const existingLike = await Like.findOne({ video: videoId, likeBy: userId });

  if (existingLike) {
    // Remove the like document for this video and user
    const result = await Like.deleteOne({ _id: existingLike._id });
    return res
      .status(200)
      .json(new ApiResponse(200, result, "Like removed successfully"));
  } else {
    // Create a new like document for this video and user
    const like = await Like.create({
      video: videoId,
      likeBy: userId,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, like, "Like added successfully"));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const userId = req.user._id;
  const existingComment = await Like.findOne({
    comment: commentId,
    likeBy: userId,
  });

  if (existingComment) {
    // Remove the like document for this video and user
    const result = await Like.deleteOne({ _id: existingComment._id });
    return res
      .status(200)
      .json(new ApiResponse(200, result, "Comment removed successfully"));
  } else {
    // Create a new like document for this video and user
    const comment = await Like.create({
      comment: commentId,
      likeBy: userId,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, comment, "Comment added successfully"));
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  const userId = req.user._id;
  const existingTweet = await Like.findOne({
    tweet: tweetId,
    likeBy: userId,
  });

  if (existingTweet) {
    // Remove the like document for this video and user
    const result = await Like.deleteOne({ _id: existingTweet._id });
    return res
      .status(200)
      .json(new ApiResponse(200, result, "Liked Tweet removed successfully"));
  } else {
    // Create a new like document for this video and user
    const tweet = await Like.create({
      tweet: tweetId,
      likeBy: userId,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, tweet, "Liked Tweet added successfully"));
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const userId = req.user._id;
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likeBy: new mongoose.Types.ObjectId(userId),
        video: { $ne: null },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoDetails",
      },
    },
    {
      $unwind: "$videoDetails",
    },
    {
      $replaceRoot: { newRoot: "$videoDetails" },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Liked videos retrieved successfully")
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
