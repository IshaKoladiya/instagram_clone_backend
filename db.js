const mongoose = require('mongoose')

mongoose.connect("mongodb://localhost:27017/instagram_clone").then(()=>{
    console.log("Connected to MongoDB")
});

const db = mongoose.connection;

db.on("connection",()=>{
    console.log("Connected to MongoDB")
})

module.exports = db;

