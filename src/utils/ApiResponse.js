/**
 * Represents an API response.
 * @constructor
 * @param {number} statusCode - The status code of the response.
 * @param {any} data - The data included in the response.
 * @param {string} [message=Success] - The message associated with the response.
 */
class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export { ApiResponse };
