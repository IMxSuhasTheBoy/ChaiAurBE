/// 2.approach, returning the function in promises format
const asyncHandler = (reqHandler) => {
  (req, res, next) => {
    Promise.resolve(reqHandler(req, res, next)).catch((err) => next(err));
  };
};
export { asyncHandler };

/// 1.approach HOF: const asyncHandler = (Fn) => { async () => {trycatch} }; /// accepting a func then passing it into an func
/*
const asyncHandler = (Fn) => async (req, res, next) => {
  try {
    await Fn(req, res, next);
  } catch (error) {
    ///expecting error code from user
    res.status(err.code || 500).json({
      success: false,
      message: err.message,
    });
  }
};
*/
///pourpose/output : take a func wrap it with try catch (for error handling work) then return the func
