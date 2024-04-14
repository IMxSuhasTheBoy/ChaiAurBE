import express, { urlencoded } from "express";
import cookieParser from "cookie-parser"; ///access & set cookies from user browser (Secure cookies for server operations*), to help in perform crud operation based on those server/browser cookie session data
import cors from "cors"; ///Docs https://github.com/expressjs/cors#readme ///Explore config options
/***Enabling CORS lets the server tell the browser it's permitted to use an additional origin.
 *https://web.dev/articles/cross-origin-resource-sharing
 */

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
); //!NOTE: for dev phase origin is set to *, it must be changed as per deployment/hosting config
app.use(express.json({ limit: "16kb" })); ///Docs https://expressjs.com/en/5x/api.html#express.json
app.use(urlencoded({ extended: true, limit: "16kb" })); ///Docs https://expressjs.com/en/5x/api.html#express.urlencoded
app.use(express.static("public")); ///Docs https://expressjs.com/en/5x/api.html#express.static
app.use(cookieParser()); ///Github https://github.com/expressjs/cookie-parser#readme

//TODO: routes imports
import userRouter from "./routes/user.routes.js";
import healthcheckRouter from "./routes/healthcheck.routes.js";
import videoRouter from "./routes/video.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import communityPostRouter from "./routes/communityPost.routes.js";
import commentRouter from "./routes/comment.routes.js";


//TODO: routes declaration
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/communityPosts", communityPostRouter);
app.use("/api/v1/comments", commentRouter);


export { app };
