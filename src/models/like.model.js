import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
    },
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
    tweet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tweet",
    },
    likeBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

likeSchema.index({ video: 1, likeBy: 1 }, { unique: true, sparse: true });
likeSchema.index({ comment: 1, likeBy: 1 }, { unique: true, sparse: true });
likeSchema.index({ tweet: 1, likeBy: 1 }, { unique: true, sparse: true });

export const Like = mongoose.model("Like", likeSchema);
