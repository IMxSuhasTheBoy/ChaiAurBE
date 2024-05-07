# professional Backend Project instructor [ChaiAurCode youtube](https://www.youtube.com/@chaiaurcode)

This server application is a platform for streaming and watching videos. It provides a platform for users to upload their videos, discover content from other users, and engage with the community.

## Features

- **User Authentication**: Secure authentication system allows users to sign up, log in, and log out securely.
- **Video Uploading**: Authenticated users can upload their videos to the platform effortlessly.
- **Video Streaming**: Seamlessly stream high-quality videos uploaded by other users.
- **Social Interaction**: Engage with the community by commenting on videos and giving likes.
- **Community Posts**: Create, edit, and delete community posts, add comments and likes to them.
- **Create Playlists**: Create, edit, and delete playlists for your videos.
- **Video Management**: Edit, delete, and search for videos in the platform, add comments and likes to them.
- **User/Channel Dashboard In developement\***: Exiting insights of your channel stats and details at your fingertips.

## Technologies Used

- **Node.js**: JavaScript runtime environment for server-side development.
- **Express.js**: Minimalist web framework for Node.js.
- **MongoDB**: NoSQL database for storing application data.
- **Mongoose**: Elegant MongoDB object modeling for Node.js.
- **JSON Web Tokens (JWT)**: Standard for securely transmitting information between parties.
- **Multer**: Middleware for handling multipart/form-data, primarily used for file uploads.
- **bcrypt.js**: Library for hashing passwords.
- **Cloudinary**: Cloud-based media management platform for storing and delivering videos.

## Getting Started

### Prerequisites

- Node.js and npm installed on your machine
- MongoDB installed and running locally or a MongoDB Atlas account

### Installation

1. Clone this repository: `git clone https://github.com/IMxSuhasTheBoy/ChaiAurBE.git`
2. Navigate to the project directory: `cd ChaiAurBE`
3. Install dependencies: `npm install`
4. Set up environment variables: Create a `.env` file in the root directory and add the following variables:

   ```plaintext
   PORT=8000
   MONGODB_URI=your_mongodb_connection_string
   CORS_ORIGIN=*
   ACCESS_TOKEN_SECRET=your_access_token_secret
   ACCESS_TOKEN_EXPIRY=1d
   REFRESH_TOKEN_SECRET=your_refresh_token_secret
   REFRESH_TOKEN_EXPIRY=10d
   HTTP_ONLY=true
   SECURE=true
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

5. Start the server: `npm  -r dotenv/config --experimental-json-modules start`

### Usage

- Visit `https://chaiaurbe.onrender.com/` in your browser to access the application.
- Sign up for a new account or log in if you already have one.
- Upload videos, watch videos, comment on videos, and interact with other users.

## Contributing

Contributions are welcome! If you find any bugs or have suggestions for new features, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For inquiries and support, please contact us at [communicate.suhas@gmail.com](communicate.suhas@gmail.com)

---

## TODO:\* This strategy outlines a secure and structured approach to handling user authentication and session management

- User registration:
- Users register through a POST request to the API.
- User credentials are stored in a MongoDB database using Mongoose.
- User login:
- Users log in with their credentials through a POST request to the login API.
- Upon successful login, access and refresh tokens are generated and stored in cookies.
- The refresh token is also stored in the user's database document.
- Accessing secured data:
- Users can access secured routes as long as their access token is valid.
- Access tokens are verified on every secured route using a middleware.
- Token expiration:
- When the access token expires, the user's attempt to access a secured route triggers a refresh token verification process.
- If the refresh token is valid, a new access token is issued and possibly a new refresh token as well.
- Logout:
- Logging out involves clearing the session and revoking the tokens.
- The logout route clears the refresh token from the user's database document and cookies.
- Re-login:

- After logging out, users need to re-login with their credentials to access secured APIs.

---

## Access tokens and refresh tokens

Access tokens and refresh tokens are crucial components in modern web applications for user authentication. Access tokens are used to authenticate API calls from the frontend, granting users access to resources. On the other hand, refresh tokens work alongside access tokens to enable long-lived sessions without the need for repeated logins. Refresh tokens have a longer lifespan compared to access tokens, allowing for seamless and secure long-term authentication.

In the context of modern web applications, the concept of access tokens involves providing initial access to resources, while refresh tokens play a key role in maintaining sessions over extended periods. These tokens work together to ensure secure authentication without the need for frequent re-authentication. Access tokens are typically used for passwordless authentication and granting users access to shared resources, while refresh tokens help in extending user sessions without compromising security.

By understanding and implementing access and refresh tokens, organizations can enhance the security and user experience of their applications. These tokens are essential in protocols like OAuth 2.0 and OpenID Connect, where they replace traditional credentials to grant access securely. Overall, access tokens and refresh tokens are fundamental in modern authentication processes, ensuring a smooth and secure login experience for users.

- **Access Tokens**:

- Access tokens are short-lived tokens that authenticate API calls from the frontend, granting users access to specific resources.
- These tokens have a limited lifetime for security reasons, reducing the window of opportunity for attackers to misuse stolen tokens.
- When an access token expires, the user would typically need to re-authenticate to obtain a new one.

- **Refresh Tokens**:

- Refresh tokens are long-lived tokens that help in obtaining new access tokens without requiring the user to log in again.
- They serve the purpose of maintaining user sessions over extended periods without frequent re-authentication.
- Refresh tokens are used to request new access tokens after the shorter-lived access tokens expire.

- **Working Together**:
- When an access token expires, the application can use a refresh token to obtain a new access token without user intervention.
- The application can make a request to the token endpoint using the refresh token to get a new access token, ensuring continuous access to resources.
- Refresh tokens play a crucial role in providing a seamless user experience by enabling long-term authentication without the need for repeated logins.

In summary, access tokens authenticate API calls and have a short lifespan, while refresh tokens help in obtaining new access tokens without user interaction, ensuring continuous access to resources in modern web applications.

---

## some common transient errors that can occur during mongodb atlas aggregation pipeline execution

Transient errors are temporary issues that can occur during the execution of a MongoDB Atlas aggregation pipeline. These errors can be caused by various factors, such as network issues, server overload, or temporary data inconsistencies. Here are some common transient errors that can occur during MongoDB Atlas aggregation pipeline execution:

1. **Network Timeouts**: Network timeouts can occur when the aggregation pipeline takes longer than expected to execute due to network latency or other issues. This can result in a timeout error, indicating that the pipeline execution failed due to a network issue.
2. **Server Overload**: MongoDB Atlas servers can become overloaded due to high traffic or resource contention. This can result in errors such as "server selection timeout" or "too many open connections", indicating that the pipeline execution failed due to server overload.
3. **Data Inconsistencies**: Data inconsistencies can occur when multiple processes are modifying the same data simultaneously. This can result in errors such as "duplicate key error" or "write conflict", indicating that the pipeline execution failed due to data inconsistencies.
4. **Query Plan Changes**: MongoDB Atlas can change the query plan for an aggregation pipeline based on various factors, such as data distribution or index availability. This can result in errors such as "index not found" or "pipeline stage failed", indicating that the pipeline execution failed due to query plan changes.

To handle these transient errors, you can implement retry logic in your code to retry the aggregation pipeline execution if it fails due to a transient error. This can help ensure that the pipeline execution is successful even if it fails due to a temporary issue. Additionally, you can monitor your MongoDB Atlas cluster for any errors or issues and ensure that the appropriate indexes are created on your collections to optimize the aggregation pipeline execution.

Citations:
[1](https://www.mongodb.com/community/forums/t/intercepting-the-aggregation-pipeline-and-creating-custom-errors/198963)
[2](https://www.mongodb.com/docs/atlas/app-services/functions/handle-errors/)
[3](https://www.mongodb.com/community/forums/t/ignore-mongodb-aggregate-errors-and-just-return-the-error-proned-ids/147922)
[4](https://www.mongodb.com/community/forums/t/does-mongodb-have-a-naming-convention-for-collection-and-field-naming/11806)
[5](https://stackoverflow.com/questions/5916080/what-are-naming-conventions-for-mongodb)

---

Securing refresh tokens in a web application is crucial for maintaining the integrity of the authentication process. Here are some best practices for securing refresh tokens:

1. **Store Refresh Tokens Securely**: Avoid storing refresh tokens on the client-side and instead keep them on the backend server associated with the user's account for enhanced security[1].

2. **Use HTTPS**: Ensure that all communications involving refresh tokens are transmitted over secure channels using HTTPS to prevent interception and unauthorized access[2].

3. **Implement Token Rotation**: Employ token rotation mechanisms to mitigate risks associated with leaked refresh tokens. This practice involves issuing new refresh tokens each time they are used, enhancing security[3].

4. **Revoke Refresh Tokens**: Provide functionality to revoke refresh tokens when needed, such as when a user logs out or in case of security concerns. This helps prevent unauthorized access to resources[4].

5. **Implement Strict Storage Measures**: Enforce strict storage requirements to prevent refresh tokens from being leaked. For instance, in web applications, ensure that refresh tokens only leave the backend when sent to the authorization server, and protect the client secret[5].

By adhering to these best practices, web applications can enhance the security of refresh tokens, safeguard user authentication, and protect sensitive resources from unauthorized access.

Citations:
[how-to-secure-a-refresh-token](https://stackoverflow.com/questions/55486341/how-to-secure-a-refresh-token)
[access-token-vs-refresh-token](https://www.descope.com/blog/post/access-token-vs-refresh-token)
[oauth-refresh-token-best-practices](https://stateful.com/blog/oauth-refresh-token-best-practices)
[auth0-refresh-tokens](https://auth0.com/learn/refresh-tokens)
[what-are-refresh-tokens-and-when-to-use-them](https://www.loginradius.com/blog/engineering/guest-post/what-are-refresh-tokens-and-when-to-use-them/)

| Status Code | Use Case                      | Description                                                                                               | Purpose                                                                                                                             |
| ----------- | ----------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 400         | Bad Request                   | The server cannot process the request due to client error, such as malformed syntax or deceptive routing. | Indicates an issue with the client's request that prevents the server from processing it.                                           |
| 401         | Unauthorized                  | Authentication is required, but the user lacks valid credentials.                                         | Alerts the client that authentication is needed to access the resource.                                                             |
| 402         | Payment Required              | Reserved for future use, intended for scenarios where payment is required.                                | Currently not utilized but reserved for potential future implementations where payment is necessary for access.                     |
| 403         | Forbidden                     | The server understands the request but refuses to authorize it.                                           | Indicates that the server is aware of the request but denies access to the resource.                                                |
| 404         | Not Found                     | The requested resource is not found on the server.                                                        | Informs the client that the requested resource does not exist on the server.                                                        |
| 405         | Method Not Allowed            | The request method is not supported for the requested resource.                                           | Indicates that the HTTP method used in the request is not allowed for the specified resource.                                       |
| 406         | Not Acceptable                | The server cannot generate a response that the client can accept based on the request's Accept headers.   | Informs the client that the server cannot provide a response in a format acceptable to the client.                                  |
| 407         | Proxy Authentication Required | Authentication with a proxy server is required.                                                           | Indicates that the client must authenticate with a proxy server before accessing the requested resource.                            |
| 408         | Request Timeout               | The server timed out waiting for the request.                                                             | Indicates that the server did not receive the complete request within the expected time frame.                                      |
| 409         | Conflict                      | The request conflicts with the current state of the server.                                               | Signifies that the request cannot be completed due to a conflict with the server's current state.                                   |
| 410         | Gone                          | The requested resource is no longer available on the server and has been permanently removed.             | Informs the client that the resource previously available is now permanently gone and should be removed from caches and references. |
| 411         | Length Required               | The server requires a Content-Length header in the request.                                               | Indicates that the server needs the Content-Length header to process the request.                                                   |
| 412         | Precondition Failed           | The server does not meet the preconditions specified in the request headers.                              | Indicates that the server did not meet the conditions specified by the client in the request headers.                               |
| 413         | Payload Too Large             | The request entity is larger than the server's limits.                                                    | Informs the client that the request body exceeds the server's size limits.                                                          |
| 414         | URI Too Long                  | The requested URI is longer than the server can interpret.                                                | Indicates that the URI provided in the request is too long for the server to process.                                               |
| 415         | Unsupported Media Type        | The server does not support the media format of the requested data.                                       | Informs the client that the server cannot process the request due to an unsupported media type.                                     |
| 416         | Range Not Satisfiable         | The range specified in the Range header cannot be fulfilled.                                              | Indicates that the range requested in the Range header cannot be satisfied by the server.                                           |
| 417         | Expectation Failed            | The server cannot meet the expectation indicated by the Expect request header.                            | Informs the client that the server cannot meet the expectation specified in the Expect request header.                              |
| 418         | I'm a teapot                  | The server refuses to brew coffee with a teapot.                                                          | A humorous status code not intended for serious use, indicating that the server cannot brew coffee with a teapot.                   |
| 421         | Misdirected Request           | The request was directed at a server that cannot produce a response.                                      | Indicates that the request was sent to a server that cannot respond to it, often due to misconfiguration.                           |

Citations:

1. [EasyName - What do the HTTP status codes such as 403, 404, 500 mean?](https://www.easyname.com/en/support/hosting/158-what-do-the-http-status-codes-such-as-403-404-500-mean)
2. [Wikipedia - List of HTTP status codes](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes)
3. [Umbraco - HTTP status codes](https://umbraco.com/knowledge-base/http-status-codes/)
4. [Moz - HTTP status codes](https://moz.com/learn/seo/http-status-codes)
5. [MDN - HTTP status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
