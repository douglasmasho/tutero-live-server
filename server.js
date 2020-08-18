const express = require("express");
const app = express();
const path = require("path");
const PORT = process.env.PORT || 5000;
const {v4: uuidv4} = require("uuid");
// import {v4 as uuidv4} from "uuid";

const server = app.listen(PORT, ()=>{
    console.log(`the server is running on port ${PORT}`)
});
const socket = require("socket.io");
const io = socket(server);


// app.use(express.static(path.join(__dirname, 'build')));
// app.get('/*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'build', 'index.html'));
// });




const rooms = {};
/*
rooms{
    roomID: [user1, user2,....]
    roomID: [user1, user2,....]
    roomID: [user1, user2,....]
    roomID: [user1, user2,....]
}
*/ 

//record of the user's room
const userRoom = {}
/*
userRoom{
    userID: roomID,
    userID: roomID,
    userID: roomID,
    userID: roomID,
}
*/ 

io.on("connection", socket=>{
    console.log(`the socket ${socket.id} has connected`);
    socket.on("join room", data=>{
        const roomID = data;
        //see if the room exists 
        if(rooms[roomID]){
            //check the size, limit to 6.
            const length = rooms[roomID].length;
            if(length === 2){
                socket.emit("room full", "sorry the room is full");
                return
            }else{
                //put them into the room
                socket.join(roomID);
                rooms[roomID].push(socket.id);
                socket.join(roomID);
            }
        }else{
            //if it does not exist, then create a room
            rooms[roomID] = [socket.id];
            socket.join(roomID);
        }
        //record the user's room
        userRoom[socket.id] = roomID;
        //respond with the other users
        const otherUsers = rooms[roomID].filter(id=>(id !== socket.id));
        socket.emit("you joined", otherUsers);
        // console.log(rooms[roomID]);
        console.log(socket.rooms);

    })

    socket.on("sending signal", data=>{
        //send the signal over to the old users, include the callerID so that they know who to respond to
        io.to(data.recipient).emit("caller sending signal", {callerID: socket.id, signal: data.signal});
        // console.log(data)
    })

    socket.on("returning signal", data=>{
        io.to(data.callerID).emit("recipient returned signal", {recipientID: socket.id, signal: data.signal})
    })

    socket.on("disconnecting", ()=>{
        const room = userRoom[socket.id];

        socket.to(room).emit("client disconnected", socket.id);
    })
    
    socket.on("disconnect", ()=>{
        //remove them from the room that they were in
        const roomID = userRoom[socket.id]
        const room = rooms[roomID];
        //filter the room if it exists
        if(room){
            rooms[roomID]  = room.filter(userID=>(userID !== socket.id));    
            console.log(rooms[roomID]);
        }
    })
    socket.on("hello world", data=>{
        const roomID = userRoom[socket.id];
        socket.to(roomID).emit("hello world", "hello bro")
    })

    socket.on("pause video", data=>{
        const roomID = userRoom[socket.id];
        const userID = rooms[roomID].find(id=> id !== socket.id);
        if(userID){
            io.to(userID).emit("pause video", "");
        }
    })

    socket.on("resume video", data=>{
        const roomID = userRoom[socket.id];
        const userID = rooms[roomID].find(id=> id !== socket.id);
        if(userID){
            io.to(userID).emit("resume video", "");
        }
    });



    socket.on("mute audio", data=>{
        console.log("the peer has been found");
        const roomID = userRoom[socket.id];
        const userID = rooms[roomID].find(id=> id !== socket.id);
        if(userID){
            io.to(userID).emit("mute audio", "");
        }
    });

    socket.on("unmute audio", data=>{
        const roomID = userRoom[socket.id];
        const userID = rooms[roomID].find(id=> id !== socket.id);
        if(userID){
            io.to(userID).emit("unmute audio", "");
        }
    })



    //////////////////////chat room/////////////////////////
    socket.on("message", data=>{
        const roomID = userRoom[socket.id];
        const userID = rooms[roomID].find(id=> id !== socket.id);
        io.to(roomID).emit("message", {msg: data, id: socket.id, uuId: uuidv4()});
    })

    socket.on("typing", data=>{
        const roomID = userRoom[socket.id];
        socket.to(roomID).emit("typing", socket.id);
    })

    socket.on("stopped typing", data=>{
        const roomID = userRoom[socket.id];
        socket.to(roomID).emit("stopped typing", "");
    })

    socket.on("message deleted", data=>{
        const roomID = userRoom[socket.id];
        const deletedMsgId = data;
        io.to(roomID).emit("message deleted", deletedMsgId);
    })
})
