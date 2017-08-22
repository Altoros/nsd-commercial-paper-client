
# Clients for the Commercial Paper Pilot for NSD

These clients are implemented with NodeJS and use popular library [socket.io](https://socket.io/) to connect
to members' API servers over http or WebSocket and get notified of events in instructions lifecycle.

**sign** client is to be run by NSD members. Will receive `Instruction.matched` event and will sign Alameda xml payload 
and will update the instruction with its signature.
A sample signing method hashes the payload; to implement other signing algorithms 
change `sign` method in [./lib/signer.js](./lib/signer.js) 

**download** client is to be run by NSD. Will receive `Instruction.executed` event and will download Alameda xml payload
and signatures form both parties and save into a local file to be picked up by Alameda; upon success 
will update the instruction record on the ledger with `downloaded` status.

Install
==========

`npm install`

Run
===

Signer app
-----------
`API=http://localhost:4001 USER=signUser npm run sign`

Downloader app
-------------- 
`API=http://localhost:4000 FOLDER_SAVE=../savehere USER=downloadUser npm run download`



Development
-----------

You can use docker-compose to run all the necessary services in addition to the basic project  
`docker-compose up -d`  
