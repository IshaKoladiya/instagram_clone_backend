const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const createToken = (data, callbackfunc) => {
  jwt.sign(data, "IK412$", callbackfunc);
};

const verifyToken = (token, callbackfunc) => {
  jwt.verify(token, "IK412$", callbackfunc);
};

const bcryptHash = (password, callbackfunc) => {
  bcrypt.hash(password, 10, callbackfunc);
};

const bcryptVerify = (password, hash, callbackfunc) => {
  bcrypt.compare(password, hash, callbackfunc);
};

module.exports = {
  createToken,
  bcryptHash,
  verifyToken,
  bcryptVerify,
};
