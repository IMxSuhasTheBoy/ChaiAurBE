import { Router } from "express";
import {
  addCommentOnVideo,
  addCommentOnCommunityPost,
  getVideoComments,
  getCommunityPostComments,
  updateComment,
  deleteComment,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/vid/:videoId").get(getVideoComments).post(addCommentOnVideo);

router
  .route("/cp/:communityPostId")
  .get(getCommunityPostComments)
  .post(addCommentOnCommunityPost);
router.route("/c/:commentId").delete(deleteComment).patch(updateComment);

export default router;
