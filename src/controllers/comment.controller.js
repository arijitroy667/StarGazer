import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    { $unwind: "$owner" },
    { $sort: { createdAt: -1 } },
    { $skip: (parseInt(page) - 1) * parseInt(limit) },
    { $limit: parseInt(limit) },
    {
      $project: {
        _id: 1,
        content: 1,
        createdAt: 1,
        owner: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;
  const { content } = req.body;
  const userId = req.user._id;
  const newComment = await Comment.create({
    content,
    video: videoId,
    owner: userId,
  });

  if (!newComment) {
    throw new ApiError(500, "Failed to add comment");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, newComment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const { content } = req.body;
  const userId = req.user._id;

  const updatedComment = await Comment.findOneAndUpdate(
    { _id: commentId, owner: userId },
    { $set: { content: content } },
    { new: true }
  );

  if (!updatedComment) {
    throw new ApiError(
      404,
      "Comment not found or you do not have permission to update it"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;
  const userId = req.user._id;

  const deleteComment = await Comment.findOneAndDelete(
    { _id: commentId, owner: userId },
  );

  if (!deleteComment) {
    throw new ApiError(
      404,
      "Comment not found or you do not have permission to delete it"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deleteComment, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
