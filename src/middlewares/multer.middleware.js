import multer from "multer"; //Docs : https://github.com/expressjs/multer#readme
import path from "path";

//Docs : https://github.com/expressjs/multer?tab=readme-ov-file#diskstorage
const storage = multer.diskStorage({
  /**
   * A function that determines the destination of a file.
   * @return {void} no return value
   */
  destination: function (req, file, cb) {
    cb(null, "./public/temp"); //! null is passed cause as of now not handling the errors.
  },

  /**
   * A function that generates a unique filename for the uploaded file.
   * @param {Object} file - the file being uploaded
   * @return {String} the unique filename for the uploaded file
   */
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9); //Ex. 1631151633204-564789231
    const originalExtension = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + originalExtension); //! configure as per requirement, may multiple files of same name can be uploaded (will be overriden)
  },
});

export const upload = multer({
  storage,
});
/*
* Multer Configuration:
The code sets up Multer disk storage configuration for handling file uploads in an Express application.
* Disk Storage Configuration:
The storage constant defines the disk storage settings for Multer, specifying the destination and filename functions for uploaded files.
* Destination Function:
The destination function determines where uploaded files will be stored on the server. In this case, files are saved in the "./public/temp" directory.
* Filename Function:
The filename function specifies how uploaded files will be named. It creates the unique filename by combining the current date and a random number with the original extension of the uploaded file.
* Multer Middleware:
The upload constant creates a Multer middleware instance using the configured storage settings, allowing the application to handle file uploads based on the defined storage configuration.
*/
