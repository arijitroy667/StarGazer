import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const userId = req.user._id;
  if (!content || !content.trim()) {
    throw new ApiError(400, "Content is required");
  }

  const newTweet = await Tweet.create({
    content: content.trim(),
    owner: userId,
  });

  if (!newTweet) {
    throw new ApiError(500, "Failed to create tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(201, newTweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const userId = req.params.userId;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const tweets = await Tweet.find({ owner: userId })
    .sort({ createdAt: -1 })
    .populate("owner", "username avatar");

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "User tweets fetched successfully"));
});

const getEveryTweet = asyncHandler(async (req, res) => {
  const tweets = await Tweet.find({})
    .sort({ createdAt: -1 })
    .populate("owner", "username avatar");

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "All tweets fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;
  const userId = req.user._id;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  if (!content || !content.trim()) {
    throw new ApiError(400, "Content is required");
  }

  const updatedTweet = await Tweet.findOneAndUpdate(
    { _id: tweetId, owner: userId },
    { content: content.trim() },
    { new: true, runValidators: true }
  );

  if (!updatedTweet) {
    throw new ApiError(404, "Tweet not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  const deletedTweet = await Tweet.findOneAndDelete({
    _id: tweetId,
    owner: userId,
  });

  if (!deletedTweet) {
    throw new ApiError(404, "Tweet not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deletedTweet, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, getEveryTweet, updateTweet, deleteTweet };
