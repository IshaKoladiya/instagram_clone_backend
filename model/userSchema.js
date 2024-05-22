const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    // unique: true,
  },
  fullname: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    require: true,
  },
  password: {
    type: String,
    require: true,
  },
  bio: {
    type: String,
    required: false,
  },
  profile: {
    type: String,
    required: false,
  },
  followers: {
    type: Number,
    required: false,
  },
  followings: {
    type: Number,
    required: false,
  },
  posts:{
    type: Number,
    required: false,
  }
});

// create person model
const userModel = mongoose.model("users", userSchema);
module.exports = userModel;
