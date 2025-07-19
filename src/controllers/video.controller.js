import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
  getPublicIdFromUrl,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query;

  const userId = req.user?._id;

  if (!userId || !isValidObjectId(userId)) {
    throw new ApiError(400, "Valid userId is required");
  }

  // Build sort object
  const sortOrder = sortType === "asc" ? 1 : -1;
  const sortObj = {};
  sortObj[sortBy] = sortOrder;

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Query videos by owner
  const videos = await Video.find({ owner: userId })
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit))
    .populate("owner", "username avatar");

  // Get total count for pagination info
  const totalVideos = await Video.countDocuments({ owner: userId });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        page: parseInt(page),
        limit: parseInt(limit),
        totalVideos,
        totalPages: Math.ceil(totalVideos / limit),
      },
      "Videos fetched successfully"
    )
  );
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const userId = req.user?._id;

  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "Title and description are required");
  }

  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoFileLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "Video file and thumbnail are required");
  }

  // Upload to cloudinary
  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  if (!videoFile?.url) {
    throw new ApiError(500, "Video file upload failed");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!thumbnail?.url) {
    throw new ApiError(500, "Thumbnail upload failed");
  }

  // Create video document
  const video = await Video.create({
    title: title.trim(),
    description: description.trim(),
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    owner: userId,
    duration: videoFile.duration,
  });

  // Get the created video with populated owner, similar to registerUser
  const publishedVideo = await Video.findById(video._id).populate(
    "owner",
    "username avatar"
  );

  if (!publishedVideo) {
    throw new ApiError(500, "Failed to publish video");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, publishedVideo, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId).populate(
    "owner",
    "username avatar"
  );

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const { title, description } = req.body;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const thumbnailLocalPath = req.file?.path;

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is required");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!thumbnail) {
    throw new ApiError(500, "Failed to upload thumbnail");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      title,
      description,
      thumbnail: thumbnail.url,
    },
    { new: true }
  );

  if (!updatedVideo) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  // 1. Find the video document
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // 2. extract public_id from url
  const videoPublicId = getPublicIdFromUrl(video.videoFile);
  const thumbnailPublicId = getPublicIdFromUrl(video.thumbnail);

  if (!videoPublicId || !thumbnailPublicId) {
    throw new ApiError(
      500,
      "Could not extract public_id from video or thumbnail URL"
    );
  }

  // 3. Delete files from Cloudinary
  await deleteFromCloudinary(videoPublicId);
  await deleteFromCloudinary(thumbnailPublicId);

  // 4. Delete the video document
  await Video.findByIdAndDelete(videoId);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Video and files deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  video.isPublished = !video.isPublished;
  await video.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        video,
        `Video is now ${video.isPublished ? "published" : "unpublished"}`
      )
    );
});

const getUserVideos = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }
  const videos = await Video.find({ owner: userId })
    .populate("owner", "username avatar")
    .sort({ createdAt: -1 });

  if (!videos || videos.length === 0) {
    throw new ApiError(404, "No videos found for this user");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, videos, "User videos fetched successfully"));
});

const getEveryVideo = asyncHandler(async (req, res) => {

  const page = Number(req.params.page) > 0 ? Number(req.params.page) : 1;
const limit = Number(req.params.limit) > 0 ? Number(req.params.limit) : 10;

  // Pagination
  const skip = (parseInt(page) - 1) * limit;

  // Query all videos
  const videos = await Video.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("owner", "username avatar");

  // Get total count for pagination info
  const totalVideos = await Video.countDocuments();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        page: page,
        limit: limit,
        totalVideos,
        totalPages: Math.ceil(totalVideos / limit),
      },
      "All videos fetched successfully"
    )
  );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  getUserVideos,
  getEveryVideo
};
