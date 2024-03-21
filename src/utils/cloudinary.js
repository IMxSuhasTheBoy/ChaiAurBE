import { v2 as cloudinary } from "cloudinary";
import { extractPublicId } from "cloudinary-build-url";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    //TODO: upload file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto", //*Additional options as per requirements.
    });
    //*file has been uploaded successfully,

    // ? console.log(`File is uploaded on cloudinary! ! ! ${response.url} ! ! !`);
    console.log("Upload cloudinary respose", response.url);

    //TODO: Remove the locally saved temporary file after confirming the uploaded file path with local path of file.
    fs.unlinkSync(localFilePath);

    //TODO: file upload success so return the response;
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); ///Remove the locally saved temporary file as the upload operation got failed
    return null;
  }
};

const destroyFileOnCloudinary = async (oldFileUrl) => {
  try {
    //TODO: extract publicId from oldFileUrl
    // const publicId = oldFileUrl.match(/\/v\d+\/([^\.\/]+)/)[1];
    const publicId = extractPublicId(oldFileUrl);
    if (!publicId) return null;

    //TODO: destroy file on cloudinary
    const response = await cloudinary.uploader.destroy(publicId);

    //TODO: file destroy success so return the response;
    return response;
  } catch (error) {
    return null;
  }
};
export { uploadOnCloudinary, destroyFileOnCloudinary };
