const mongoose = require("mongoose");

const userFollowerFollowingSchema = new mongoose.Schema({
  targetId: {
    type: String,
    required: true,
  },
  followId: {
    type: String,
    required: true,
  },
});

const userFollowerFollowingModal = mongoose.model("followerFollowings", userFollowerFollowingSchema);

module.exports = userFollowerFollowingModal;