import multer from "multer"; //Docs : https://github.com/expressjs/multer#readme

//Docs : https://github.com/expressjs/multer?tab=readme-ov-file#diskstorage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp"); //! null is passed cause as of now not handling the errors.
  },

  filename: function (req, file, cb) {
    cb(null, file.originalname); //! configure as per requirement

    console.log(file.fieldname, file.originalname, "Multer");
  },
});

export const upload = multer({
  storage,
});
