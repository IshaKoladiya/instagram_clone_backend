const mongoose = require('mongoose')


const messageSchema = new mongoose.Schema({
    senderId: { type: String, require: true },
    receiverId: { type: String, require: true },
    message: { type: String, require: true },
    timestamp: { type: String, require: true },
})


const messageModel = mongoose.model("messages", messageSchema);

module.exports = messageModel;