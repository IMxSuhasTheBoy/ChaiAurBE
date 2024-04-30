import { Router } from "express";
import {
  createCommunityPost,
  deleteCommunityPost,
  getAllCommunityPosts,
  updateCommunityPost,
} from "../controllers/communityPost.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").get(getAllCommunityPosts);
router.route("/create").post(createCommunityPost);
router
  .route("/:communityPostId")
  .patch(updateCommunityPost)
  .delete(deleteCommunityPost);

export default router;
