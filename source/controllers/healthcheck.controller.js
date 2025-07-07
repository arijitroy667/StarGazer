import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (req, res) => {
  let dbStatus = "unknown";
  try {
    // For Mongoose >= 5.13, use connection.readyState
    dbStatus =
      mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    // Optionally, actually ping the DB
    // await mongoose.connection.db.admin().ping();
  } catch (err) {
    dbStatus = "error";
  }

  const status = {
    api: "OK",
    database: dbStatus,
    uptime: process.uptime(),
    timestamp: new Date(),
  };

  return res
    .status(200)
    .json(new ApiResponse(200, status, "Healthcheck successful"));
});

export { healthcheck };
