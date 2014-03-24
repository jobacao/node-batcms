var PermissionError = function(){
  var error = Error.apply(this, arguments);
  error.name = "permission-error";
  return error;
};
var NotFoundError = function(){
  var error = Error.apply(this, arguments);
  error.name = "notfound-error";
  return error;
};
var UserError = function(){
  var error = Error.apply(this, arguments);
  error.name = "user-error";
  return error;
};

exports = module.exports;
exports.UserError = UserError;
exports.NotFoundError = NotFoundError;
exports.PermissionError = PermissionError;
