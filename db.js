const mongoose = require('mongoose')

mongoose.connect("mongodb+srv://ishakoladiyaInstagram:Instagram2004@instagram.hz4zsue.mongodb.net/instagram_clone").then(()=>{
    console.log("Connected to MongoDB")
});

const db = mongoose.connection;

db.on("connection",()=>{
    console.log("Connected to MongoDB")
})

module.exports = db;

