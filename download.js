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
if(!path.isAbsolute(FOLDER_SAVE)){
  FOLDER_SAVE = path.join(__dirname, FOLDER_SAVE);
}

const USER = process.env.USER || 'signUser';

// check target folder
mkdirSyncSafe(FOLDER_SAVE);


const EVENT_INSTRUCTION_SIGNED = 'Instruction.signed';

/**
 * @type {string} organisation deponent code
 */
var deponent = null;
/**
 * @type {string} orgPeerID of endorse peer(s) for signing instruction
 */
var endorsePeer = null;

////////////////////////////////////////////////////////////
// rest client
var client = new FabricRestClient(API);
client.getConfig().then(config=>{
  // we have received ledger config

  // extract some stuff from config
  org = config.org;
  deponent = config['account-config'][org].dep;
  var endorsePeerId = Object.keys(config['network-config'][org]||{}).filter(k=>k.startsWith('peer'))[0];
  endorsePeer = org+'/'+endorsePeerId;

  logger.info('************* DOWNLOAD APP *************');
  logger.info('API:\t%s', API);
  logger.info('FOLDER_SAVE:\t%s', FOLDER_SAVE);
  logger.info('USER:\t%s', USER);
  logger.info('ENDORSER:\t%s', endorsePeer);
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
      var instruction = helper.normalizeInstruction(iInfo.payload);
      return Promise.resolve(_processInstruction(instruction, iInfo.channel_id));
    });
  });




  // PROCESS INSTRUCTION

  function _processInstruction(instruction, channel_id){
    logger.trace('_processInstruction channel - %s:', channel_id, JSON.stringify(instruction));
    if(!signer.isSignedAll(instruction)){
      logger.debug('Not signed by all members:', helper.instruction2string(instruction));
      return;
    }else{
      logger.debug('Instruction has signed by all members:', helper.instruction2string(instruction));
    }

    // TODO data format ewxample
    var fileData = {
      alamedaFrom : instruction.alamedaFrom,
      alamedaTo   : instruction.alamedaTo,
      alamedaSignatureFrom : instruction.alamedaSignatureFrom,
      alamedaSignatureTo   : instruction.alamedaSignatureTo,
    };
    var filepath = path.join(FOLDER_SAVE, helper.instructionFilename(instruction)+'.json');

    return writeFilePromise(filepath, JSON.stringify(fileData))
      .then(function(){
        logger.debug('File write succeed: %s', filepath);

        // TODO: not really need always sign up
        // return client.signUp(USER);
      }).then(function(/*body*/){

        // TODO: do we really need such status?
        // return client.setInstructionStatus(channel_id, [endorsePeer], instruction, 'downloaded');
      }).then(function(result){
        // logger.debug('Status updated for:', helper.instruction2string(instruction));
      })
      .catch(function(e){
        logger.error('Script error:', e);
      });
  }


});


/**
 * @param {string} folder
 */
function mkdirSyncSafe(folder){
  try{
    fs.mkdirSync(FOLDER_SAVE);
  }catch(e){
    if(e.code != 'EEXIST'){
      throw e;
    }
  }
}


/**
 * @param
 */
function writeFilePromise(filepath, data){
  return new Promise(function(resolve, reject){
    fs.writeFile(filepath, data, function(err){
      err ? reject(err) : resolve();
    })
  });
}