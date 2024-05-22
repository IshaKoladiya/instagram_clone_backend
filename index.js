const db = require("./db");
const userModel = require("./model/userSchema");
const postImageModal = require("./model/postImageSchema");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

const userFollowerFollowingModal = require("./model/userFollowerFollowingSchema");
app.use(express.json());
app.use(bodyParser.json());
const cors = require("cors");
app.use(cors());
app.use(express.json());
const bcrypt = require("bcrypt");
const {
  createToken,
  bcryptHash,
  verifyToken,
  bcryptVerify,
} = require("./utils");

// multer image upload

const multer = require("multer");
const messageModel = require("./model/messageSchema");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "../frontend/src/assets/image/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    cb(null, uniqueSuffix + file.originalname);
  },
});

const upload = multer({ storage: storage });

// soket.io

io.on("connection", (socket) => {
  console.log(socket.id);

  socket.on("sent-message", (message) => {
    console.log(message.id);

    verifyToken(message.senderId, (err, tokenID) => {
      console.log(tokenID.id);
      const messageData = message;

      messageData.senderId = tokenID.id;

      messageModel.create(messageData).then((res) => {
        messageModel
          .find({
            $or: [
              { receiverId: res.receiverId, senderId: res.senderId },
              { receiverId: res.senderId, senderId: res.receiverId },
            ],
          })
          .then((data) => {
            io.emit("chats", data);
          });
      });
    });

    // messageModel
    //   .find({ receiverId: message.receiverId })
    //   .then((mess) => {
    //     const receiverIds = mess.map((msg) => msg.receiverId);
    //     return userModel.find({ _id: { $in: receiverIds } });
    //   })
    //   .then((usersData) => {
    //     usersData.forEach((userData) => {
    //       console.log([{userData}]);
    //       io.emit("show-user", [userData]);
    //     });
    //   });
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

// get all user in chat

app.get("/user/chat", async (req, res) => {
  try {
    const receiveId = await messageModel.find({});
    const findAllReceiveId = receiveId.map((message) => message.receiverId);
    const uniqueReceiveIds = [...new Set(findAllReceiveId)];
    const receiveIdData = await userModel.find({ _id: uniqueReceiveIds });
    res.status(200).send([receiveIdData]);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get("/users/chat-show-user/:id", async (req, res) => {
  try {
    var receiverID = req.params.id;
   
    const token = req.headers.authorization.split(" ")[1];

    // Verify token
    verifyToken(token, async (err, data) => {
      if (err) {
        res.status(500).send("Something Went Wrong");
      } else {
        var senderID = data.id;
        console.log('receverID : ', receiverID);
        console.log('senderID : ', senderID);
       
        const findUser = await messageModel.find({
          senderId: receiverID,
          receiverId: senderID,
        });
        
        const receiverIds = [
          ...new Set(findUser.map((message) => message.receiverId)),
        ];
        
        console.log(receiverIds);
        const receiveIdData = await userModel.find({ _id: { $in: receiverIds } });

        res.status(200).send(receiveIdData);
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("User Not Found");
  }
});

// SignUp Api with jwt and bycript

app.post("/user/signup", async (req, res) => {
  try {
    const data = await userModel.findOne({ email: req.body.email });

    if (data) {
      return res.status(500).send("Email already in use.");
    } else {
      bcryptHash(req.body.password, async (err, hash) => {
        if (err) {
          return res.status(500).send("Something Went Wrong");
        } else {
          const user = req.body;
          user.bio = "";
          user.profile = "";
          user.password = hash;

          try {
            const userData = await userModel.create(user);
            createToken({ id: userData._id }, (err, token) => {
              if (err) {
                return res.status(500).send("Something Went Wrong");
              } else {
                return res
                  .status(201)
                  .send({ token, username: userData.username });
              }
            });
          } catch (err) {
            return res.status(500).send(err);
          }
        }
      });
    }
  } catch (error) {
    return res.status(500).json({ error: "Server Error" });
  }
});

// Log in Api

app.post("/user/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        error: "Incomplete credentials. Please provide email and password.",
      });
    }
    const user = await userModel.findOne({ email: email });
    if (!user) {
      return res
        .status(400)
        .json({ error: "User not found. Please check your credentials." });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res
        .status(400)
        .json({ error: "Incorrect password. Please try again." });
    }

    createToken({ id: user._id }, (err, token) => {
      if (err) {
        res.status(500).send("Error generating token");
      } else {
        res.json({
          message: "Login successful",
          token: token,
          username: user.username,
        });
      }
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error in user login." });
  }
});

// Forgot-password
app.post("/user/forgot-password", (req, res) => {
  userModel
    .findOne({ email: req.body.userNameOrEmail })
    .then((data) => {
      if (data) {
        createToken({ id: data._id }, (err, token) => {
          if (err) {
            res.status(500).send("Something Went Wrong");
          } else {
            const url = `http://localhost:5173/new-password?token=${token}`;
            console.log(url);
            res.status(200).send(url);
          }
        });
      } else {
        res.status(404).send("User Not Found");
      }
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});

// Reset-password  // new password
app.post("/user/reset-password", (req, res) => {
  verifyToken(req.body.token, (err, data) => {
    if (err) {
      res.status(500).send("Something Went Wrong");
    } else {
      bcryptHash(req.body.password, (err, hash) => {
        if (err) {
          res.status(500).send("Something Went Wrong");
        } else {
          userModel
            .findByIdAndUpdate(data.id, {
              password: hash,
            })
            .then((data) => {
              res.status(200).send("User Password Updated");
            })
            .catch((err) => {
              res.status(500).send("Something Went Wrong");
            });
        }
      });
    }
  });
});

//     ********************   profile   **************************

// find User Id
app.post("/user/id", async (req, res) => {
  try {
    const userData = await userModel.findById(req.body.id);

    const findFollowers = await userFollowerFollowingModal.find({
      targetId: userData.id,
    });
    const findFollowings = await userFollowerFollowingModal.find({
      followId: userData.id,
    });
    const findPosts = await postImageModal.find({
      userId: userData.id,
    });

    userData.posts = findPosts.length;

    userData.followers = findFollowers.length;
    userData.followings = findFollowings.length;
    res.status(200).send({ user: userData, posts: findPosts });
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post("/user/token", async (req, res) => {
  try {
    verifyToken(req.body.token, async (err, data) => {
      if (err) {
        return res.status(500).send("Something Went Wrong");
      }
      try {
        const userDataToken = await userModel.findById(data.id);

        const findFollowers = await userFollowerFollowingModal.find({
          targetId: userDataToken.id,
        });
        const findFollowings = await userFollowerFollowingModal.find({
          followId: userDataToken.id,
        });

        userDataToken.followers = findFollowers.length;
        userDataToken.followings = findFollowings.length;

        const findPosts = await postImageModal.find({
          userId: userDataToken.id,
        });

        userDataToken.posts = findPosts.length;

        res.status(200).send({ user: userDataToken, posts: findPosts });
        console.log(findPosts);
      } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching user data");
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing request");
  }
});

// update user details

app.put("/user", (req, res) => {
  verifyToken(req.body.token, (err, data) => {
    if (err) {
      res.status(500).send("Somthing Went Wrong");
    } else {
      userModel
        .findByIdAndUpdate(data.id, {
          fullname: req.body.fullname,
          username: req.body.username,
          bio: req.body.bio,
        })
        .then((data) => {
          res.status(201).send("user updated Successfully");
        })
        .catch((err) => {
          res.status(500).send(err);
        });
    }
  });
});

// user profile image

app.post("/user/profile-image", upload.single("image"), (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  verifyToken(token, (err, data) => {
    if (err) {
      res.status(500).send("Something Went Wrong");
    } else {
      userModel
        .findByIdAndUpdate(data.id, {
          profile: req.file.filename,
        })
        .then((data) => {
          res.status(201).send("Profile Image Uploaded");
        })
        .catch((err) => {
          res.status(500).send(err);
        });
    }
  });
});

// search users
app.get("/users", async (req, res) => {
  const search = req.query.search;
  const findUsers = await userModel.find({
    username: { $regex: search, $options: "i" },
  });
  res.status(200).send(findUsers);
});

// follow user
app.post("/user/follow", async (req, res) => {
  try {
    const token = req.body.token;
    const userId = req.body.id;

    verifyToken(token, async (err, data) => {
      if (err) {
        return res.status(500).send("Something Went Wrong");
      } else {
        const userExists = await userFollowerFollowingModal.findOne({
          targetId: userId,
          followId: data.id,
        });

        if (userExists) {
          await userFollowerFollowingModal.findByIdAndDelete(userExists._id);
          return res.status(200).send("User Unfollowed");
        } else {
          await userFollowerFollowingModal.create({
            targetId: userId,
            followId: data.id,
          });
          return res.status(201).send("User Followed");
        }
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
});

//  ********************************** show list *********************************

// following get all user by id

app.post("/user/following-alluser-id", async (req, res) => {
  try {
    const data = await userFollowerFollowingModal.find({
      followId: req.body.id,
    });
    let FollowingList = [];
    const promises = data.map(async (Useritem) => {
      const user = await userModel.findById(Useritem.targetId);
      FollowingList.push(user);
    });
    await Promise.all(promises);
    res.status(200).send(FollowingList);
  } catch (err) {
    res.status(500).send(err);
  }
});

// Folowing get all user By Token
app.post("/user/following-alluser-token", (req, res) => {
  verifyToken(req.body.token, (err, data) => {
    if (err) {
      return res.status(500).send(err);
    }
    userFollowerFollowingModal
      .find({
        followId: data.id,
      })
      .then(async (data) => {
        let FollowingUserList = [];
        const promises = data.map(async (item) => {
          const user = await userModel.findById(item.targetId);
          FollowingUserList.push(user);
        });
        await Promise.all(promises);
        res.status(200).send(FollowingUserList);
      })
      .catch((err) => {
        res.status(500).send(err);
      });
  });
});

// Followers get all user by id
app.post("/user/followers-alluser-id", (req, res) => {
  userFollowerFollowingModal
    .find({
      targetId: req.body.id,
    })
    .then(async (data) => {
      let FollowingUserList = [];
      const promises = data.map(async (item) => {
        const user = await userModel.findById(item.followId);
        FollowingUserList.push(user);
      });
      await Promise.all(promises);
      res.status(200).send(FollowingUserList);
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});

// Followers get all user By Token

app.post("/user/followers-alluser-token", (req, res) => {
  verifyToken(req.body.token, (err, data) => {
    if (err) {
      return res.status(500).send(err);
    }
    userFollowerFollowingModal
      .find({
        targetId: data.id,
      })
      .then(async (data) => {
        let FollowingUserList = [];
        const promises = data.map(async (item) => {
          const user = await userModel.findById(item.followId);
          FollowingUserList.push(user);
        });
        await Promise.all(promises);
        res.status(200).send(FollowingUserList);
      })
      .catch((err) => {
        res.status(500).send(err);
      });
  });
});

// ************************************* unfollow user ********************************

// unfollow id
app.post("/user/unfollow/id", async (req, res) => {
  try {
    const token = req.body.token;
    const userId = req.body.id;

    verifyToken(token, async (err, data) => {
      if (err) {
        return res.status(500).send("Something Went Wrong");
      } else {
        console.log(userId);
        console.log("object");
        console.log(token);
        const userExists = await userFollowerFollowingModal.findOne({
          targetId: userId,
          followId: data.id,
        });

        if (userExists) {
          await userFollowerFollowingModal.findByIdAndDelete(userExists._id);
          console.log(userExists);
          return res.status(200).send("User Unfollowed");
        } else {
          return res.status(404).send("User not followed");
        }
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
});

// unfollow token

app.post("/user/unfollow/token", async (req, res) => {
  try {
    const token = req.body.token;
    const userId = req.body.id;

    verifyToken(token, async (err, data) => {
      if (err) {
        return res.status(500).send("Something Went Wrong");
      } else {
        console.log(userId);
        console.log("object");
        console.log(data.id);
        const userExists = await userFollowerFollowingModal.findOne({
          targetId: data.id,
          followId: userId,
        });

        if (userExists) {
          await userFollowerFollowingModal.findByIdAndDelete(userExists._id);
          console.log(userExists);
          return res.status(200).send("User Unfollowed");
        } else {
          return res.status(404).send("User not followed");
        }
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
});

// Create User Post

app.post("/user/post", upload.single("image"), (req, res) => {
  verifyToken(req.body.token, (err, data) => {
    if (err) {
      res.status(500).send("Something went wrong");
    } else {
      postImageModal
        .create({
          userId: data.id,
          image: req.file.filename,
          caption: req.body.caption,
          location: req.body.location,
          altText: req.body.altText,
          commentOff: !req.body.commentOff,
          likeViewCount: !req.body.likeViewCount,
        })
        .then((data) => {
          res.status(201).send("Post added");
        })
        .catch((err) => {
          res.status(500).send(err);
        });
    }
  });
});

// user Show Random Image Explore
app.get("/users/explore", async (req, res) => {
  try {
    const data = await postImageModal.find();
    let randomisePosts = [];

    while (data.length !== randomisePosts.length) {
      const randomIndex = Math.floor(Math.random() * data.length);

      const checkIfExists = randomisePosts.find(
        (post) => post.id == data[randomIndex].id
      );

      if (!checkIfExists) {
        randomisePosts.push(data[randomIndex]);
      }
    }

    let postWithUserPromises = randomisePosts.map((post) => {
      return userModel.findById(post.userId);
    });

    const userData = await Promise.all(postWithUserPromises);

    let postWithUser = [];
    userData.forEach((user, index) => {
      postWithUser.push({ user: user, post: randomisePosts[index] });
    });

    res.status(200).send(postWithUser);
  } catch (err) {
    res.status(500).send(err);
  }
});

// Home page show post randomly

app.post("/users/posts", (req, res) => {
  verifyToken(req.body.token, (err, data) => {
    userFollowerFollowingModal
      .find({
        followId: data.id,
      })
      .then((followers) => {
        let followersId = [];

        followers.forEach((fol) => {
          followersId.push(fol.targetId);
        });

        postImageModal
          .find()
          .then((data) => {
            let randomisePosts = [];

            while (data.length !== randomisePosts.length) {
              const randomIndex = Math.floor(Math.random() * data.length);

              const checkIfExcits = randomisePosts.find(
                (post) => post.id == data[randomIndex].id
              );

              if (!checkIfExcits) {
                randomisePosts.push(data[randomIndex]);
              }
            }

            const onlyFollowingPosts = randomisePosts.filter((post) => {
              return followersId.includes(post.userId);
            });

            console.log(onlyFollowingPosts);

            let postWithUserPromises = onlyFollowingPosts.map((post) => {
              return userModel.findById(post.userId);
            });

            Promise.all(postWithUserPromises)
              .then((userData) => {
                let postWithUser = [];
                userData.forEach((user, index) => {
                  postWithUser.push({
                    user: user,
                    post: randomisePosts[index],
                  });
                });
                res.status(200).send(postWithUser);
              })
              .catch((err) => {
                res.status(500).send(err);
              });
          })
          .catch((err) => {
            res.status(500).send(err);
          });
      });
  });
});

httpServer.listen(4000, () => {
  console.log("server listening on port 4000");
});
