# Anonymouse :shipit:
Anonymouse is the beginnings of an anonymous question service built for classrooms.
(it's a squirrel, close enough)

## Mission Statement
Being a college student, I recognize the peer pressure against asking questions.  This blocks professors from gauging where their students are at with the material, and degrades the quality of learning for everyone.

I am creating this service to hopefully provide a solution to this issue.  With Anonymouse, students can send questions to their professors in real time without them being broadcast to the classroom.  The professor can see who has asked this question (to discourage abuse of the platform), but is discouraged to reveal them.  Once a professor has received a question, they can either accept the question and broadcast it to the rest of the students for consideration, or, if they think it does not contribute to the discussion, can reject the question, preventing other students from seeing it.

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
