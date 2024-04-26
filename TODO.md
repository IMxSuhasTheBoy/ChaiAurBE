# professional Backend Project instructor ChaiAurCode youtube

DOCS

- [prettier config](https://prettier.io/docs/en/options)

- [Express](https://expressjs.com/en/5x/api.html)

---

---

- **Data model** strategys

- **Application file/folder setup** pattern strategys

- **DB connection strategys** (mongoosejs)

> 1. DB connection using async func/iife (try-catch) + node server execution index.js
> 2. DB connection in db.js then exported for execution in index.js

- **Express app** setup

- **Middlewares** setup & config (express > (static, urlencoded, json) cors, cookie-parser, multer)

- **(err req res) routes** for incoming data sources

- **async code handling** utility func strategys HOF :

> 1. const asyncHandler = (Fn) => (Fn) => {tryCatch};
> 2. const asyncHandler = (Fn) => (Fn) => {Promise};

- **An ApiResponse class constructor for sending responses that are with positive status**

- **An ApiError class constructor for sending overriden Error class response, with stack trace**

## **MongoDB mongoose models**

- **middlewares** setup & config (mongoose-aggregate-paginate-v2, bcryptjs, jsonwebtoken)

                  Models

  - User
  - Video
  - subscription

## File upload stategy

- [multer](https://github.com/expressjs/multer#readme)

- Take file from user through multer.

- Temporarily save on local server storage.

  - middleware function of multer.diskStorage()

- Access file from local server storage using cloudinary & save it there.

  - give path of local file to the cloudinary
  - [nodejs File system methods](https://nodejs.org/dist/latest-v20.x/docs/api/fs.html)
  - once file upload completes, delete the locally stored files

                 Controller Logic for routes

### API routes v1/users/register

1. Get/Extract user details
   - from frontend/POST req
2. Validation of data
   - not empty
   - valid syntax of email
   - strength of password
3. Check if user aleady exists (DB call)
   - username, email
4. Check for Images (middleware takes care of local file storage)
   - checks for avatar in multer, also for coverImage
   - avatar ? move : throw error
   - then upload to cloud (cludinary util)
   - checks for avatar in cloudinary - & url from response is accessible for 5th steps
5. Create user Object (mongoose)
   - create entry in DB (edge cases for fields)
   - checks for user creation success. (DB query strategy, step 6: chained query strategy)
6. Remove fields from success response of step 5
   - password
   - refreshToken
7. Check for user creation
   - success ? return response : return error
   - response code structure

### API routes v1/users/login

1. Get/Extract user details
   - from frontend/POST req
2. Check email or username or both ? move : throw error
3. Find the user ? move : throw error
4. Password check ? move : throw error (bcrypt: additional methods in schema Object instance)
5. Access & refresh token (more turnarronds to figure out)
   - generating method for convenience in user.controller
6. Send above in cookies (strategy as per requirement)
   - cookie options for disabling the cookie data modification access from frontend
   - instance of user
   - return res with cookies, from login the secured routes access is allowed only after verfying accesstoken

### API routes v1/users/logout

1. Have a way for verifying user id with accessToken
   - using custom auth middleware (to verify user tokens) method adds user details in new Object in the req Object, can be used to logout the user
2. Get user details
   - using auth middleware got verified \_id of loggedIn user from req.user
   - clear its refreshToken a in DB (as logout meant to shut the session)
   - perform clear tokens from cookies as res

### API routes v1/users/refresh-token

1. Get incomming refresh token from req ? move : error
   - from cookies
2. Verify incommingRefreshToken (jwt auth middleware)
3. Find user with decodedToken (DB call) ? move : error
4. Compare refresh tokens ? move : error
5. Generate new Tokens & save in user instance (generateAccessAndRefreshTokens method)
6. Return res

### API routes v1/users/change-password

1. Get incomming old & new password from req
2. Define criteria for newPassword ? move : error
3. Find user (DB call)
   - as user is logged in, user instance have \_id
4. (Old) Password check ? move : throw error (bcrypt: additional methods in schema Object instance)
5. Change user password with incomming newPassword
6. Save changes in DB
7. return res

### API routes v1/users/current-user

1. return res with json in data, pass the user Object
   - As for logged in user already the auth middleware is ran, So we have current user object retured in req Object

### API routes v1/users/update-account

1. Get fields for updation ? move : error
   - from req.body (fields as per requirement)
2. Update user (DB call)
   - Find user with as we have req.user Object access (auth middleware)
   - update with updation fields
   - with the DB response ommit unnecessory fields
3. return res with json in data, pass the user Object

### API routes v1/users/avatar

concept: end point hits avatar,
new patch req recieved with file (multer gives local path),
in controller, access the local path,
upload on cloud (url recieved),
DB call for update file url,
TODO: access current avatar cloud url, then delete old cloud url (file) make a utiliy of cloudinary to destroy files,
send success res

1. Get new local file path ? move : error
2. Upload on cloud
3. Update the user Object (DB call)
4. Delete old cloud file
   - access oldurl from user instance
   - pass oldurl to destroy (util of cloudinary)
5. return res

### API routes v1/users/cover-image

1. Get new local file path ? move : error
2. Upload on cloud
3. Update the user Object (DB call)
4. Delete old cloud file if present (saved a cloudinary destroy call)
   - access oldurl from user instance
     - oldurl "" ? dont save & dont call destroy : save url
   - pass oldurl to destroy (util of cloudinary)
5. return res

### API routes v1/users/c/:username

1. Get username for which channel profile details to fetch
   - req parameter username ? move : error
2. aggrigation pipelines to achive goal :: Get calculated/filtered/grouped details & inject in user instance such as: subscribersCount, channelSubscribedToCount, isSubscribed. the $project data as per requirement such as : fullName, username, coverImage, email etc.
3. pipelines targeting Subscription model
   - 1st $match : find that user doc which is matching the reqested user
   - 2nd $lookup : find subscribers of user (target channel field(count 4th pipline))
   - 3rd $lookup : find subscribedTo of user (target subscriber field (count 4th pipline))
   - 4th $addFields : in the user instance add additional fields
     - subscribersCount $size
     - channelsSubscribedToCount $size
     - isSubscribed $cond -> boolean (logic ex: is logged in user(myself) is present in subscribers field of channel)
   - 5th $project : mention selected fields to pass in returning response as requirement
4. check if channel/details exists? move : error
5. return res with 1st Element of channel Array [Object]

In the channel aggregation pipeline logic is used to fetch and process data from the "User" collection in MongoDB. Here is a brief explanation of how the aggregation pipeline works in this context:

1. **Match Stage**:

   - The first stage filters documents in the "User" collection based on the provided username, which is converted to lowercase for case-insensitive matching.

2. **Lookup Stages**:

   - Two lookup stages are used to fetch related data from the "subscriptions" collection:
     - The first lookup matches the "\_id" field of the "User" collection with the "channel" field in the "subscriptions" collection to get subscribers.
     - The second lookup matches the "\_id" field of the "User" collection with the "subscriber" field in the "subscriptions" collection to get channels subscribed to by the user.

3. **AddFields Stage**:

   - This stage adds computed fields to the documents:
     - "subscribersCount": Calculates the number of subscribers for the user.
     - "channelsSubscribedToCount": Calculates the number of channels the user is subscribed to.
     - "isSubscribed": Checks if the current user (req.user) is subscribed to the channel being queried.

4. **Project Stage**:

   - The project stage shapes the output by including specific fields like fullName, username, subscribersCount, channelsSubscribedToCount, isSubscribed, avatar, coverImage, and email.

5. **Error Handling**:

   - If no channel is found based on the username, a 404 error is thrown.

6. **Response**:
   - If the channel is found, a successful response is sent back with the fetched user channel data.

In summary, this aggregation pipeline fetches user channel data, including subscriber counts, channels subscribed to, and subscription status, based on the provided username. It leverages MongoDB's aggregation framework to process and shape the data before returning it as a response to the client.

### API routes v1/users/history

on every video view by user
pushing that video id in user instance's watchHistory field.

1. aggrigation pipelines to achive goal :: Left-Join video id to user watchHistory also nest pipeline to have new fields consisting details of video owner id

   - 1st $match : find that user doc which is matching the loggedIn user using \_id
   - 2nd $lookup (users): Find video id(as watchHistory) from Video instance left-join onto watchHistory[] field of User instance.
     - 3rd $lookup nested (videos): Find owner details(\_id) from User instance left-join onto owner field of Video instance that is a each video of watchHistory[] of logged in user
       - 4th $project (videos): now got the owner details lets cut down it to only required fields. as fullName, avatar, username
     - 5th $addFields : extract the first element of the "owner" array and assign it to the "owner" field.

2. return res with watcHistory data

---

    ```json
    //example data output
    {
      "status": 200,
      "message": "Watch history fetched successfully!!!",
      "data": [
        {
          "_id": "609d9b2b8b9f4c001e3e4b1a",
          "title": "Sample Video 1",
          "duration": "10:30",
          "owner": {
            "_id": "609d9b2b8b9f4c001e3e4b1b",
            "fullName": "John Doe",
            "username": "johndoe",
            "avatar": "avatar_url_1"
          }
        },
        {
          "_id": "609d9b2b8b9f4c001e3e4b1c",
          "title": "Sample Video 2",
          "duration": "15:45",
          "owner": {
            "_id": "609d9b2b8b9f4c001e3e4b1d",
            "fullName": "Jane Smith",
            "username": "janesmith",
            "avatar": "avatar_url_2"
          }
        }
      ]
    }
    ```
