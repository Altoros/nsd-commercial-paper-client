
# nsd-commercial-paper-client

Clients for the Commercial Paper Pilot for NSD



Install
==========

`npm install`


Run
===


Signer app
-----------
`API=http://localhost:4000 USER=signUser npm run sign`

(optional) specify user to run invokations  

`API=http://localhost:4000 USER=signUser npm run sign`

Downloader app
--------------
`API=http://localhost:4001 npm run download`

(optional) with file location  

`API=http://localhost:4001 FOLDER_SAVE=../savehere npm run download`

(optional) specify user to run invokations  

`API=http://localhost:4000 USER=signUser npm run download`

