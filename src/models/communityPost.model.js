import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const communityPostSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
    },
    communityPostOwner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

communityPostSchema.plugin(mongooseAggregatePaginate);

export const CommunityPost = mongoose.model(
  "CommunityPost",
  communityPostSchema
);
