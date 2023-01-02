"use strict";
const express = require("express");
const app = require("express")();
const http = require("http").createServer(app);
const conn = require("./config/db");

const multer = require("multer");
const fileStorageEngine = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./images");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "--" + file.originalname);
  },
});
const upload = multer({ storage: fileStorageEngine });
const service = require("./services/DragonGameService");

const io = require("socket.io")(http);
const debug = require("debug")("test");
const events = require("./Constants").events;
const commonVar = require("./Constants").commonVar;
const MatchMaking = require("./utils/MatchMaking").MatchPlayer;
const playerManager = require("./utils/PlayerDataManager");
const makePlayer = require("./utils/connectPlayer");
const PORT = process.env.PORT || 5000;
const cors = require("cors");
app.use(cors());
const path = require("path");
app.set('views', './views')

require("./gameplay/sendsocket").sendSocket(io.sockets);
const AuthRoute = require("./routes/AuthRoutes");
const UserRoutes = require("./routes/UserRoutes");

var bodyParser = require("body-parser");
const { getImagesFromDir } = require("./controllers/UserController");
app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

//support parsing of application/x-www-form-urlencoded post data
app.use("/getImagesFromDir", UserRoutes);
app.use("/auth", AuthRoute);
app.use("/user", UserRoutes);

let onlineUserQ = [];
const maxPlayerInARoom = 7;
debug("$server started$");

//----------------------
io.on("connection", (socket) => {
  debug("a user connected " + socket.id);

  /*  OnSendPoints(socket);
  OnNotification(socket);
  OnAcceptPoints(socket);
  OnRejectPoints(socket);
  OnSenderNotification(socket);
  OnUserProfile(socket);*/
  OnUploadImage(socket);

  onEnterLobby(socket);
  RegisterPlayer(socket);
  DissConnect(socket);
});

function onEnterLobby(socket) {
  socket.on(events.onEnterLobby, (data) => {
    debug("Player Enter to lobby");
    makePlayer.registeToLobby({
      socketId: socket.id,
      playerId: data[commonVar.playerId],
    });
  });
}

function DissConnect(socket) {
  socket.on("disconnect", () => {
    debug(socket.id + " disconnected");
    makePlayer.exitToLobby(socket.id);
    playerManager.RemovePlayer(socket.id);
  });
}

function RegisterPlayer(socket) {
  socket.on(events.RegisterPlayer, (data) => {
    debug("RegisterPlayer");
    debug(data[commonVar.playerId]);
    let playerObj = {
      socket: socket,
      profilePic: data[commonVar.profilePic],
      playerId: data[commonVar.playerId],
      gameId: data[commonVar.gameId],
      balance: data[commonVar.balance],
    };
    MatchMaking(playerObj);
  });
}

/* function OnSendPoints(socket){
  // let socket = data[commonVar.socket];
 socket.on(events.OnSendPoints, async(data) =>{
   let result=await service.onSendPointsToPlayer(data.senderId,data.receiverId,data.points,data.password)
   // await getUserPoint(data);
   if(result==true){
   socket.emit(events.OnSendPoints,{"status":200,"message":"PointTransfer Successfully","data":{}});
 }
 
 else if(result==404){
 socket.emit(events.OnSendPoints,{"status":404,"message":"Receiver Not Exist","data":{}});
 }
 else{
 socket.emit(events.OnSendPoints,{"status":404,"message":"Incorrect Password","data":{}});
 
 }
 })}
 
 
 function OnUserProfile(socket){
  // let socket = data[commonVar.socket];
 socket.on(events.OnUserProfile, async(data) =>{
   let result =  await service.userByEmail(data.playerId);//authLogin
   socket.emit(events.OnUserProfile,{
     id:result[0].id,
                       distributor_id:"masterid",
                       user_id:result[0].email,
                            
                       username:result[0].first_name,
                       IMEI_no:"0",
                       device:"abcd",
                       last_logged_in:result[0].last_login,
                       last_logged_out:result[0].last_login,
                       IsBlocked:result[0].status,
                       password:result[0].password,
                       created_at:result[0].created,
                       updated_at:result[0].modified,
                       active:result[0].status,
                       coins:result[0].point
 
   });
 })
 }
 
 
 function OnNotification(socket){
   //let socket = data[commonVar.socket];
 socket.on(events.OnNotification, async(data) =>{
   let result =  await service.onNotification(data.playerId);//authLogin
   socket.emit(events.OnNotification,{
     
   
       "status":200,
       "message":"User Notification",
       "data":{
          "notification":result,
           
 
          "notification_count":result.length
       
      }
 
   });
 })
 }
 
 
 function OnAcceptPoints(socket){
  // let socket = data[commonVar.socket];
 socket.on(events.OnAcceptPoints, async(data) =>{
   let result =  await service.onAcceptPoints(data.notifyId,data.playerId);//authLogin
   socket.emit(events.OnAcceptPoints,{
     
   
       "status":200,
       "message":"Point Accept Successfully",
       "data":{
          
       
      }
 
   });
 })
 }
 
 
 
 
 function OnRejectPoints(socket){
  // let socket = data[commonVar.socket];
 socket.on(events.OnRejectPoints, async(data) =>{
   let result =  await service.onRejectPoints(data.notifyId,data.playerId);//authLogin
   socket.emit(events.OnRejectPoints,{
     
   
       "status":200,
       "message":"Point is not Accept ",
       "data":{
          
       
      }
 
   });
 })
 }
 
 
 
 
 
 function OnSenderNotification(socket){
  // let socket = data[commonVar.socket];
 socket.on(events.OnSenderNotification, async(data) =>{
   let result =  await service.onSenderNotification(data.playerId);//authLogin
   socket.emit(events.OnSenderNotification,{
     
   
       "status":200,
       "message":"User Notification",
       "data":{
          "notification":result,
           
 
          "notification_count":result.length
       
      }
 
   });
 })
 }
 
 
 */

app.get("/servertesting", (req, res) => {
  res.sendFile(path.join(__dirname + "/test.html"));
});

app.get("/test", (req, res) => {
  res.send("test");
});

app.post("/uploadImage", upload.single("image"), async (req, res) => {
  console.log(req.file);
  console.log(req.body.username);
  try {
    let sql = "INSERT INTO  user_upload_image SET ?";
    let formData1 = {
      imagename: req.file.filename,
      username: req.body.username,
    };

    const userss = await conn.query(sql, formData1);
    let statusCode = 200;
    let message = "";
    if (userss) {
      statusCode = 200;
      message = "images updated";
    } else {
      statusCode = 500;
      message = "Something went wrong! database error";
    }
    //res.send("imageload sucessfully");
    const responseDatajson = {
      status: statusCode,
      message,
    };
    res.send(responseDatajson);
  } catch (error) {
    res.status(500).send("Database error");
  }
});

function OnUploadImage(socket) {
  // let socket = data[commonVar.socket];
  socket.on(events.OnUploadImage, async (data) => {
    // let result = await service.onUploadImage(data.imagename, data.username); //authLogin
    console.log("uploadsocket", data);
    socket.emit(events.OnUploadImage, {
      status: 200,
      message: "demo testing",
      data: {},
    });
  });
}

//sendOTP
app.post('/sendOtp', function (req, res) {

  var Phone = req.body.Phone
  Phone = 7814476032

  const responseData = {
    message: "OTP sent successfully "


  }

  const jsonContent = JSON.stringify(responseData);
  res.end(jsonContent);

});



//verifyOTP
app.post('/verifyOtp', function (req, res) {

  var Phone = req.body.Phone
  Phone = 7814476032

  const responseData = {
    message: "otp varifed and user exists",
    status: "1",
    Data: {
      username: "shekhar",
      Points: "1000",

    }
  }

  const jsonContent = JSON.stringify(responseData);
  res.end(jsonContent);

});


//PlayerDetails

app.post('/PlayerDetails', function (req, res) {


  var playerresult = req.body.playerresult
  playerresult = "win"

  var playerid = req.body.playerid
  playerid = 1

  var playerscore = req.body.playerscore
  playerscore = 250

  const responseData = {
    message: "Player Data",
    status: "200",
    PlayerData : {
      playername : "Shekhar",
      playerresult : "win",
      playerid: "1",
      playerscore: "250"
    },
    OtherPlayerData: [
      { PlayersOnline: "2" },
    
      [{ playerid: 2, playerscore: "100", playerresult:"won" },
      { playerid: 3, playerscore: "175", playerresult:"won" }
     

      ]
    ]
  }





  const jsonContent = JSON.stringify(responseData);
  res.end(jsonContent);

});


//hourly tournament
app.post('/hourlyDetails', function (req, res) {

  var playerresult = req.body.playerresult
  playerresult = "win"

  var playerid = req.body.playerid
  playerid = 2

  var playerscore = req.body.playerscore
  playerscore = 139


  const responseData = {
    
    message: "Player Data",
    status: "200",
  



    PlayerData : {
      
      playername : "Shiv",
      playerresult : "win",
      playerid: "2",
      playerscore: "160"
    },
   

    Leaderboard: [
      { PlayersOnline: "4" },
    
      [{ playerid: 1, playername: "shekhar", gameswon:"10" },
      { playerid: 3, playername: "john", gameswon:"8" },
      { playerid: 4, playername: "tony", gameswon:"11" },
      { playerid: 5, playername: "jordan", gameswon:"15" }
     

      ]
    ]
  }

  
  const jsonContent = JSON.stringify(responseData);
  res.end(jsonContent);



});








//pointshistory

app.post('/pointshistory', function (req, res) {
  var receiverid = req.body.receiver

  conn.query('SELECT `id`, `point`, `createdat` FROM `point_history` WHERE receiver=?', [receiverid], function (err, result) {
    if (err) {
      console.log(err)
    } else {
      if (result.length == 0) {
        console.log("receiver not exist");
      } else {

        res.json(result);
      }
    }
  });
});

//getimages
app.get('/getimages', (req, res) => {
  let images = getImagesFromDir(path.join(__dirname, 'images'))
  res.send(images);

});

//getimagedetail
app.get('/getDetail', function (req, res) {
  conn.query('SELECT `useremail`, `uploadedat` FROM `user_upload_image`', function (err, result) {
    res.send(result)
  })
})



http.listen(PORT, () => {
  debug("listening on " + PORT);
});
