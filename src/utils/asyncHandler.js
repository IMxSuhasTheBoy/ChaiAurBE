/**
 * 2.approach HOF: returning the function in promises format
 * @param {function} reqHandler - The function to be wrapped, invoked as Promise (will be a asynchronous request handler function)
 * @returns {function} - The wrapped asynchronous request handler function.
 */
const asyncHandler = (reqHandler) => {
  return (req, res, next) => {
    Promise.resolve(reqHandler(req, res, next)).catch((error) => next(error));
  };
};
export { asyncHandler };

/** 1.approach HOF: const asyncHandler = (Fn) => { async () => {trycatch} };
 * accepting a func
 * then passing it into an function that takes
 * the req, res, next params extracted from Fn
 * and It then returns a new function that handles asynchronous operations by calling the original function Fn  * with the req, res, and next parameters, and includes error handling.
 * If an error occurs, it sets the response status to the error code or 500 and sends a JSON response with the  * error message.
 *
 * @param {Function} Fn - The function to be wrapped. (will be a asynchronous request handler function)
 * @returns {Function} - The wrapped function.
 */
/*
const asyncHandler = (Fn) => async (req, res, next) => {
  try {
    await Fn(req, res, next);
  } catch (error) {
    // expecting error code from user
    res.status(error.code || 500).json({
      success: false,
      message: error.message,
    });
  }
};
*/

//* purpose handle error in standardised format/outcome : take a func wrap it Error handling code.
