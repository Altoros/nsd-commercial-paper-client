/**
 * Created by maksim on 8/16/17.
 */

const fs  = require('fs');
const path  = require('path');
const FabricSocketClient = require('./lib/FabricSocketClient');
const FabricRestClient   = require('./lib/FabricRestClient');
const log4js  = require('log4js');
log4js.configure( require('./config.json').log4js );
const logger  = log4js.getLogger('download');

const tools   = require('./lib/tools');
const helper  = require('./lib/helper');
const signer  = require('./lib/signer');


//
const API = process.env.API;
if(!API){
  throw new Error("API is not set. Please, use environment to set it");
}

var FOLDER_SAVE = process.env.FOLDER_SAVE || './alameda';
if(!FOLDER_SAVE){
  throw new Error("FOLDER_SAVE is not set. Please, use environment to set it");
}
if(!path.isAbsolute(FOLDER_SAVE)){
  FOLDER_SAVE = path.join(__dirname, FOLDER_SAVE);
}

// check target folder
try{
  fs.mkdirSync(FOLDER_SAVE);
}catch(e){
  if(e.code != 'EEXIST'){
    console.log(e);
    process.exit(1);
  }
}



const EVENT_INSTRUCTION_SIGNED = 'Instruction.signed';

logger.info('****************************************');
logger.info('API:\t%s', API);
logger.info('FOLDER_SAVE:\t%s', FOLDER_SAVE);
logger.info('****************************************');




////////////////////////////////////////////////////////////
// Socket client
var socket = new FabricSocketClient(API);
socket.on('chainblock', function (block) {
  block = tools.replaceBuffer(block); // encode all buffer data with base64 string

  var iInfoArr = helper.getBlockInstructions(block, EVENT_INSTRUCTION_SIGNED) || [];
  if(iInfoArr.length==0) return;

  // sign and send instructions (use chainPromise to send requests sequentually)
  return tools.chainPromise(iInfoArr, function(iInfo){
    return Promise.resolve(_processInstruction(iInfo.payload, iInfo.channel_id));
  });
});



// PROCESS INSTRUCTION

function _processInstruction(instruction/*, channel_id*/){
  if(!signer.isSignedAll(instruction)){
    logger.debug('Not signed by all members:', helper.instruction2string(instruction));
    return;
  }

  var fileData = {
    alamedaFrom : instruction.alamedaFrom,
    alamedaTo   : instruction.alamedaTo,
    alamedaSignatureFrom : instruction.alamedaSignatureFrom,
    alamedaSignatureTo   : instruction.alamedaSignatureTo,
  };
  var filename = helper.instructionFilename(instruction)+'.json';

  return new Promise(function(resolve, reject){
    var filepath = path.join(FOLDER_SAVE, filename);
    fs.writeFile(filepath, JSON.stringify(fileData), function(err){
      logger.debug('File writed %s: %s', err ? 'ERR' : 'success', filepath, err||'');
      err ? reject(err) : resolve();
    })
  });
}

