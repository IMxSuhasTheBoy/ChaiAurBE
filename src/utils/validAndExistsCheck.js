import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { CommunityPost } from "../models/communityPost.model.js";
import { isValidObjectId } from "mongoose";

//The fn to validate the id from req.params: if any of the 3 checks is true fn returns true else false
const isInvalidOrEmptyId = (id, paramName) => {
  const isEmptyParam = id === paramName && id.startsWith(":");
  // console.log(!isValidObjectId(id), " !isValidObjectId(id)");
  // console.log(isEmptyParam, "isEmptyParam");
  // console.log(!id?.trim(), " !id?.trim()");
  return !isValidObjectId(id) || isEmptyParam || !id?.trim();
};

//Try retry logic too
const existsCheck = async (documentId, model, api) => {
  const document = await model.findById(documentId);

  if (!document) {
    console.error(`Document with id ${documentId} does not exists for sure`);

    //vidDoc: likesArr+
    const likesOfInexistingDoc = await Like.find({
      video: new mongoose.Types.ObjectId(documentId),
    }).exec();

    //vidDoc: commentsArr+
    const commentsOfInexistingDoc = await Comment.find({
      video: new mongoose.Types.ObjectId(documentId),
    });

    // each commentLikesArr+
    const findOperations = commentsOfInexistingDoc.forEach(async (element) => {
      const commentLikesOfInexistingDoc = await Like.find({
        comment: element._id,
      });
    });

    // if any of above exists for inexistent vidDoc, delete all of em
    //  vid liksArr- & each commentLikesArr- then commentsArr-
  } else {
    console.log(`Document with id ${documentId} exists for sure`);
    console.log(documentId, model, api, ":  existsCheck params");
  }
};

// const asyncHandler2 = (reqHandler) => {
//   return (req, res, next) => {
//     Promise.resolve(reqHandler(req, res, next)).catch((error) =>
//       console.error(error)
//     );
//   };
// };

// The expression !username?.trim() returns true if the username variable is null, undefined, or if it is a non-empty string that contains only whitespace characters. Otherwise, it returns false. The ?. is the optional chaining operator, which allows you to safely access properties of an object that may be null or undefined.<|endoftext|>

export { existsCheck, isInvalidOrEmptyId };

///!Checklist api existsCheck
// updateVideo

// const isInvalidOrEmptyId = (id) => {
//   return !isValidObjectId(id) || id.trim() === "" || !id;
// };
