import { Router } from "express";
import {
  createCommunityPost,
  deleteCommunityPost,
  getUserTweets,
  updateCommunityPost,
} from "../controllers/communityPost.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/create").post(createCommunityPost);
router.route("/user/:userId").get(getUserTweets);
//getAllCommunityPosts
router
  .route("/:communityPostId")
  .patch(updateCommunityPost)
  .delete(deleteCommunityPost);

export default router;
