
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

Prerequisites
==========

```bash
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt install nodejs jq
```

Install
==========

```bash
git clone https://github.com/olegabu/nsd-commercial-paper-client
cd nsd-commercial-paper-client
npm install
```

Run
===

Signer app
-----------
`npm run sign`

Stop signer app:

`pkill -f 'node sign'` 

Optional arguments:

- AUTOSIGN=true: Sign the instruction and upload the signature automatically.
- USER=signUser: Specify user other than currently logged in as the creator of the transaction.
- API defaults to `http://localhost:4000`.

You can omit USER or pass any string: this field will become part of transaction creator to identify the process that signed.

Stop signer app:

`pkill -f 'node sign'` 

Downloader app
-------------- 
`npm run download`

Stop downloader app:

`pkill -f 'node download'` 

Optional arguments:

- FOLDER_SAVE=./saveHere: Specify directory other than the default `./alameda`.
- USER=downloadUser: Specify user other than currently logged in as the creator of the transaction.
- API defaults to `http://localhost:4000`.

Alameda files from both transferer and receiver are saved along with their signatures into a json file:

```json
{
  "alamedaFrom": "\n<Batch>\n<Documents_amount>1</Documents_amount>\n<Document DOC_ID=\"1\" version=\"7\">\n<ORDER_HEADER>\n<deposit_c>NDC000000000</deposit_c>\n<contrag_c>CA9861913023</contrag_c>\n<contr_d_id>100</contr_d_id>\n<createdate>2017-08-23</createdate>\n<order_t_id>16</order_t_id>\n<execute_dt>2017-08-23</execute_dt>\n<expirat_dt>2017-08-24 23:59:59</expirat_dt>\n</ORDER_HEADER>\n<MF010>\n<dep_acc_c>AC0689654902</dep_acc_c>\n<sec_c>87680000045800005</sec_c>\n<deponent_c>CA9861913023</deponent_c>\n<corr_acc_c>WD0D00654903</corr_acc_c>\n<corr_sec_c>58680002816000009</corr_sec_c>\n<corr_code>DE000DB7HWY7</corr_code>\n<based_on>1000</based_on>\n<based_numb>10000</based_numb>\n<based_date>2017-08-23</based_date>\n<securities><security>\n<security_c>RU000ABC0001</security_c>\n<security_q>1</security_q>\n</security>\n</securities>\n<deal_reference>testc</deal_reference>\n<date_deal>2017-08-23</date_deal>\n</MF010>\n</Document>\n</Batch>\n",
  "alamedaTo": "\n<Batch>\n<Documents_amount>1</Documents_amount>\n<Document DOC_ID=\"1\" version=\"7\">\n<ORDER_HEADER>\n<deposit_c>NDC000000000</deposit_c>\n<contrag_c>DE000DB7HWY7</contrag_c>\n<contr_d_id>200</contr_d_id>\n<createdate>2017-08-23</createdate>\n<order_t_id>16/1</order_t_id>\n<execute_dt>2017-08-23</execute_dt>\n<expirat_dt>2017-08-24 23:59:59</expirat_dt>\n</ORDER_HEADER>\n<MF010>\n<dep_acc_c>AC0689654902</dep_acc_c>\n<sec_c>87680000045800005</sec_c>\n<deponent_c>CA9861913023</deponent_c>\n<corr_acc_c>WD0D00654903</corr_acc_c>\n<corr_sec_c>58680002816000009</corr_sec_c>\n<corr_code>DE000DB7HWY7</corr_code>\n<based_on>2000</based_on>\n<based_numb>20000</based_numb>\n<based_date>2017-08-22</based_date>\n<securities><security>\n<security_c>RU000ABC0001</security_c>\n<security_q>1</security_q>\n</security>\n</securities>\n<deal_reference>testc</deal_reference>\n<date_deal>2017-08-23</date_deal>\n</MF010>\n</Document>\n</Batch>\n",
  "alamedaSignatureFrom": "326f12f744953100ad4fbcd3e8f6b254417c791edcb8d6b37b0f47dba60145e1",
  "alamedaSignatureTo": "90880405b6b4122085f4e0c5ba40d8bb18318a5c7632e683d56d2bfd5493cabb"
}
```

The name of the file is composed of the 9 fields that uniquely identify an instruction for matching:
`RU000ABC0001-AC0689654902-87680000045800005-WD0D00654903-58680002816000009-1-testc-20170823-20170823.json`

To parse out xml files and signatures you can use [parse](./parse.sh) script and pass the name of the json file:

```bash
./parse.sh alameda/RU000ABC0001-AC0689654902-87680000045800005-WD0D00654903-58680002816000009-1-testb-20170824-20170824.json
``` 

The script will save 4 xml files: instructions 16 and 16/1 and both signatures:

```
RU000ABC0001-AC0689654902-87680000045800005-WD0D00654903-58680002816000009-1-testb-20170824-20170824.json-alamedaFrom.xml
RU000ABC0001-AC0689654902-87680000045800005-WD0D00654903-58680002816000009-1-testb-20170824-20170824.json-alamedaTo.xml
RU000ABC0001-AC0689654902-87680000045800005-WD0D00654903-58680002816000009-1-testb-20170824-20170824.json-alamedaSignatureFrom.xml
RU000ABC0001-AC0689654902-87680000045800005-WD0D00654903-58680002816000009-1-testb-20170824-20170824.json-alamedaSignatureTo.xml
```  

Manual Signer App
-----------

If you sign xmls manually you can use [upload](./upload.sh) script to manually upload signatures from files:

```
ORG=<your org alias> CHANNEL=<channel name> API=http://<ip within your org intranet>:4000 ./upload.sh <name of signed xml file> 
```

`API` is optional and defaults to `http://localhost:4000` 

Example:

```bash
ORG=raiffeisen CHANNEL=megafon-raiffeisen ./upload.sh alameda/RU000ABC0001-AC0689654902-87680000045800005-WD0D00654903-58680002816000009-1-testa-20170824-20170824.xml 
```

Development
===========

You can use docker-compose to run all the necessary services in addition to the basic project  
`docker-compose up -d`  
