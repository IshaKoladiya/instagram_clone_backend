const mongoose = require('mongoose');

const postImageShema = new mongoose.Schema({
    userId: { type: String, require: true },
    image: { type: String, require: true },
    caption: { type: String, require: false },
    location: { type: String, require: false },
    altText: { type: String, require: false },
    likeViewCount: { type: Boolean, require: false },
    commentOff: { type: Boolean, require: false },
})

const postImageModal = mongoose.model("postImages", postImageShema);

module.exports = postImageModal;