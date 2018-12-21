# Anonymouse :shipit:
Anonymouse is the beginnings of an anonymous question service built for classrooms.
(it's a squirrel, close enough)

## Mission Statement
Being a college student, I recognize the peer pressure against asking questions.  This blocks professors from gauging where their students are at with the material, and degrades the quality of learning for everyone.

I am creating this service to hopefully provide a solution to this issue.  With Anonymouse, students can send questions to their professors in real time without them being broadcast to the classroom.  The professor can see who has asked this question (to discourage abuse of the platform), but is not supposed to reveal them.  Once a professor has received a question, they can either accept the question and broadcast it to the rest of the students for consideration, or, if they think it does not contribute to the discussion, can reject the question, preventing other students from seeing it.

I also just like experimenting with new things, so I have strictly chosen technologies with which I am not very familiar.  They are:
- __Redis__
- __WebSockets__
- __MariaDB__
- __Parcel__

With that said, these technologies did have some though put into them before being chosen, and I believe they fit the bounds of the problem well.

## How it Works
This is essentially a dance between three actors -- a professor, a student, and a WebSockets server.  WebSockets is very different from HTTP, so adjusting has been tricky.  

From what I've gathered, WebSockets maintains a persistent channel of communication between the client and server using pings and pongs.  This means once authenticated, you can rest assured that the connection is always the person they say they are -- no need to pass cookies around.

WebSockets does not carry the overhead associated with HTTP, which also unfortunately means there is much less of a defined message format.  You're pretty much free to structure the payload however you want (not that you couldn't with HTTP but you had much more of a framework).  Serialized JSON makes sense for our application.

So, once any actor receives a message, they must determine which form of message it is and respond appropriately.  How you do this is up to you.

Since WebSockets is non-transactional, this means that any user information (or other things like a Redis client) can be associated with the WebSockets connection object itself.  So say a user sends along their login information -- once verified, you can simply dump that data onto the connection object and anytime and event occurs which hands you back the client connection, you will have access to that information.

## Up Next
The system will be going through a lot of changes as I understand WebSockets better.  I have some suspicions about the request/response structures (i.e. room get/join) that are still in the system -- they seem like something better suited to HTTP, so restructuring this will be looked into.

I will eventually get a roadmap and test harness set up, but for right now, development is sort of ad-hoc.

## Message Models
Since WebSockets provides such a minimal framework, we are left to create our own schema.  Message schemas are defined below.  They are each made of two pieces of data:
1. `type` - This tells the recipient what form of message they are receiving and determines how it should be validated / handled
2. `payload` - This is the required data sent along with the request.  It is validated against the type of the request to make sure that everything is as it should be.  If it does not line up with the expected schema, it is not processed.

__Keep in mind the models represented here are JavaScript objects, they must be stringified before being sent over the wire.__

### Coming into the Server
The WebSocket server only expects a couple of types of requests.  These are detailed below, as well as in `schemas.json`.

Login - This is an attempt from the client to authenticate upon opening their WebSocket connection.  __This must be the first message sent by the client or the server will drop them__.
```javascript
{
    type: "login",
    payload: {
        username: "profDummy",
        password: "profDummyPass"
    }
}
```

Question Proposal - This is a question sent in by a student to be passed along to the professor of the room they are in.  Upon coming into the server, the message is given an ID and stored locally.
```javascript
{
    type: "question proposal",
    payload: {
        message: "Hey there, professor!"
    }
}
```

Question Response - Message coming from a professor that states whether they have accepted or rejected a given question
```javascript
{
    type: "question response",
    payload: {
        messageID: "1d3e1639-d1fc-40d6-a9cb-b04133e59d94",
        approved: true
    }
}
```

Room Get - This is a request from a professor to have the server open up a new room.  If the client is verified as a professor, the server will generate a room code and pass it back.
```javascript
{
    type: "room get",
    payload: {}
}
```

Room Join - Once a professor has created a room, they can communicate the 4-digit code to their students.  The students will then use this code to join the room by passing along this request.
```javascript
{
    type: "room join",
    payload: {
        roomID: "kwhc"
    }
}
```

### Going out of the Server
On the same coin, the WebSocket server only sends out a couple types of requests.  These are detailed below, as well as in `messages.js`.

Login Response - This tells a user whether or not their attempt to authenticate their WebSocket connection was successful.
```javascript
{
    type: "login response",
    payload: {
        approved: true
    }
}
```

Room Get Response - In response to a `Room Get` request, if the user was verified as a professor, then the server will send this back to give them their room code.  The professor can then communicate this code with students.
```javascript
{
    type: "room get response",
    payload: {
        roomID: "kwhc"
    }
}
```

Room Join Response - Once a student has been given a code by their professor, they can send this in to join that room.
```javascript
{
    type: "room join response",
    payload: {
        roomID: "kwhc",
        approved: true
    }
}
```

Question Confirmation - After a user sends in a question, the server sends them this to confirm receipt of the question.
```javascript
{
    type: "question confirmation",
    payload: {
        message: "Hey there, professor!",
        messageID: "1d3e1639-d1fc-40d6-a9cb-b04133e59d94"
    }
}
```

QuestionForward - Once the server has received a question, it gives it an ID and sends it along to the professor with this.
```javascript
{
    type: "question forward",
    payload: {
        message: "Hey there, professor!",
        messageID: "1d3e1639-d1fc-40d6-a9cb-b04133e59d94"
    }
}
```

Question Acceptance - If the professor has accepted the question by sending in a `Question Response`, then the server will publish the question to the room channel on Redis.  The subscribed Redis clients then send out `Question Acceptance` requests to notify their web clients of a new question that will be answered.
```javascript
{
    type: "question acceptance",
    payload: {
        message: "Hey there, professor!"
    }
}
```

Question Rejection - If the professor has opted to reject the question, then the server will send this out to the student to notify them.
```javascript
{
    type: "question rejection",
    payload: {
        message: "Hey there, professor!",
        messageID: "1d3e1639-d1fc-40d6-a9cb-b04133e59d94"
    }
}
```