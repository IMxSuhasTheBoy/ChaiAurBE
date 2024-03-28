import multer from "multer"; //Docs : https://github.com/expressjs/multer#readme

//Docs : https://github.com/expressjs/multer?tab=readme-ov-file#diskstorage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp"); //! null is passed cause as of now not handling the errors.
  },

  filename: function (req, file, cb) {
    cb(null, file.originalname); //! configure as per requirement, may multiple files of same name can be uploaded (will be overriden)

    console.log(file, "=====", file.fieldname, file.originalname, "Multer");
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
The filename function specifies how uploaded files will be named. It uses the original filename of the uploaded file.
* Multer Middleware:
The upload constant creates a Multer middleware instance using the configured storage settings, allowing the application to handle file uploads based on the defined storage configuration.
*/
