import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
  getVideoDuration,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

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
  const userId = req.user._id;

  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }

  // Temp. local upload using Multer
  const videoFileLocalPath = req.file?.videoFile[0]?.path;
  const thumbnailLocalPath = req.file?.thumbnail[0]?.path;

  if (!videoFileLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "Video file and thumbnail are required");
  }

  // Upload files to Cloudinary
  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile || !thumbnail) {
    throw new ApiError(500, "Failed to upload video or thumbnail");
  }

  const getPublicId = (url) => {
    // Example: extract 'folder/filename' from the URL
    const parts = url.split("/");
    const fileWithExt = parts.slice(-2).join("/"); // folder/filename.ext
    return fileWithExt.split(".").slice(0, -1).join("."); // folder/filename
  };

  const videoPublicId = getPublicId(videoFile.url);

  const videoDuration = await getVideoDuration(videoPublicId);

  const newVideo = new Video({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    title,
    description,
    duration: videoDuration,
    owner: userId,
  });

  if (!newVideo) {
    throw new ApiError(500, "Failed to create video");
  }

  await newVideo.save();

  return res
    .status(201)
    .json(new ApiResponse(201, newVideo, "Video published successfully"));
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
  //TODO: update video details like title, description, thumbnail

  const { title, description } = req.body;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const thumbnailLocalPath = req.file?.thumbnail[0]?.path;

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

  // 2. Extract public IDs from Cloudinary URLs
  // Assuming your URLs are like: https://res.cloudinary.com/<cloud_name>/.../<public_id>.<ext>
  // You should store public_id in DB for easier deletion, but if not:
  const getPublicId = (url) => {
    // Example: extract 'folder/filename' from the URL
    const parts = url.split("/");
    const fileWithExt = parts.slice(-2).join("/"); // folder/filename.ext
    return fileWithExt.split(".").slice(0, -1).join("."); // folder/filename
  };

  const videoPublicId = getPublicId(video.videoFile);
  const thumbnailPublicId = getPublicId(video.thumbnail);

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

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
