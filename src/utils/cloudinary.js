import { v2 as cloudinary } from "cloudinary";
import { extractPublicId } from "cloudinary-build-url";
import fs from "fs";
import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath, type) => {
  // console.log(localFilePath, type, "uploadOnCloudinary called");
  try {
    if (!localFilePath) return null;

    let folder = "chaiaurbe/";
    if (type === "users/avatar") {
      folder += "users/avatars/";
    } else if (type === "users/coverImage") {
      folder += "users/cover-images/";
    } else if (type === "videos/videoFile") {
      folder += "videos/video-files/";
    } else if (type === "videos/thumbnail") {
      folder += "videos/thumbnails/";
    }

    //TODO: upload file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: folder,
      public_id: path.basename(localFilePath, path.extname(localFilePath)),
      display_name: path.basename(localFilePath, path.extname(localFilePath)), //*Additional options as per requirements.
    });
    //*file has been uploaded successfully,

    // ? console.log(`File is uploaded on cloudinary! ! ! ${response.url} ! ! !`);
    console.log("Upload cloudinary respose", response);

    //TODO: Remove the locally saved temporary file after confirming the uploaded file path with local path of file.
    fs.unlinkSync(localFilePath);

    //TODO: file upload success so return the response;
    return response;
  } catch (error) {
    //TODO: Remove the locally saved temporary file as the upload operation got failed
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const destroyFileOnCloudinary = async (folderPath, oldFileUrl) => {
  try {
    if (!oldFileUrl) return null;
    //TODO: extract publicId from oldFileUrl
    const publicId = extractPublicId(oldFileUrl);
    // console.log(publicId, ": publicId");

    const parts = publicId.split("/");
    const filename = parts[parts.length - 1];
    // console.log(filename, ": filename");

    if (!publicId) return null;

    /** reference example for extraction logic
     * oldFileUrl : "http://res.cloudinary.com/dxmhivqtq/image/upload/v1712061384/wetube/users/avatars/avatar-1712061392130-674381186.png"
     * publicId : "chaiaurbe/users/avatars/avatar-1712069900961-84717110"
     * filename : "avatar-1712069900961-84717110" //!can be optimized
     * fileType : "avatar"
     */

    //TODO: destroy file on cloudinary
    // const response = await cloudinary.uploader.destroy(publicId);
    //? code with additional config as per uniqueSuffix & resource type requirement
    //TODO: extract the file type * Split a string into substrings using the specified separator and return them as an array.
    let fileType = filename.split("-")[0]; // avatar | coverImage | videoFile
    fileType = fileType === "videoFile" ? "video" : "image";
    // console.log(fileType, ": fileType");

    const response = await cloudinary.uploader.destroy(folderPath + filename, {
      resource_type: fileType,
      invalidate: true,
    });
    console.log(response, "response destroy");
    //TODO: file destroy success so return the response Obj (for extracting required properties as per diff type of controller strategy);
    return response;
  } catch (error) {
    return null;
  }
};
export { uploadOnCloudinary, destroyFileOnCloudinary };

//Experimental
// const publicId = oldFileUrl.match(/\/v\d+\/([^\.\/]+)/)[1];

///public_id without uniqueSuffix: 'chaiaurbe/users/avatars/four',

// const path = "chaiaurbe/users/avatars/avatar-1712069900961-84717110";
// const parts = path.split("/");
// const filename = parts[parts.length - 1];
// console.log(filename);
//Experimental
