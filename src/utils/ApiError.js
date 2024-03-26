//TODO: extending Error class of nodejs to have a custom & consistent error message throughout the app.
/**
 * Custom error class for API errors.
 * @class
 * @extends Error
 */
class ApiError extends Error {
/**
 * @constructor
 * Creates an instance of ApiError.
 * 
 * @param {number} statusCode - The HTTP status code of the error.
 * @param {string} [message="Something went wrong"] - The error message.
 * @param {Array} [errors=[]] - Additional errors.
 * @param {string} [stack=""] - The stack trace of the error.
 */
  constructor(
    statusCode,
    message = "Something went wrong", //! default message doesn't have a ref of problem.
    errors = [],
    stack = ""
  ) {
    super(message);                   //This calls the constructor of the Error class, passing the message parameter. This sets the message property of the ApiError instance.
    this.statusCode = statusCode;     //overriding
    this.data = null;                 //* Docs to know about whats the data field.
    this.message = message;           //overriding
    this.success = false;             //Cause Api is only served for error
    this.errors = errors;             //overriding

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
