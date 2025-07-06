import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload file to cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file after upload
    return response;
  } catch (err) {
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload failed
    return null;
  }
};

const deleteFromCloudinary = async (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};

const getPublicIdFromUrl = (url) => {
  // Cloudinary URLs look like: https://res.cloudinary.com/<cloud_name>/video/upload/v1234567890/folder/filename.mp4
  // public_id is everything after '/upload/' and before the file extension
  const parts = url.split("/upload/");
  if (parts.length < 2) return null;
  const pathWithVersionAndExt = parts[1];
  // Remove version if present (e.g., v1234567890/)
  const path = pathWithVersionAndExt.replace(/^v\d+\//, "");
  // Remove file extension
  return path.replace(/\.[^/.]+$/, "");
};

export { getPublicIdFromUrl, uploadOnCloudinary, deleteFromCloudinary };
