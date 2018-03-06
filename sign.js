/**
 * Created by maksim on 8/16/17.
 */

const fs  = require('fs');
const path  = require('path');
const FabricSocketClient = require('./lib/FabricSocketClient');
const FabricRestClient   = require('./lib/FabricRestClient');
const log4js  = require('log4js');
log4js.configure( require('./config.json').log4js );
const logger  = log4js.getLogger('sign');

const tools   = require('./lib/tools');
const helper  = require('./lib/helper');
const signer  = require('./lib/signer');
const MODE = '0666';

// get parameters
const API = process.env.API || 'http://localhost:4000';
if(!API){
  throw new Error("API is not set. Please, use environment to set it");
}

const USER = process.env.USER || 'signUser';

const EVENT_INSTRUCTION_MATCHED = 'Instruction.matched';
const EVENT_INSTRUCTION_EXECUTED = 'Instruction.executed';
// const INSTRUCTION_SIGNED_STATUS = 'signed';
const INSTRUCTION_EXECUTED_STATUS = 'executed';

var AUTOSIGN = parseInt(process.env.AUTOSIGN);

var FOLDER_SAVE = process.env.FOLDER_SAVE || './alameda';
if(!path.isAbsolute(FOLDER_SAVE)){
  FOLDER_SAVE = path.join(__dirname, FOLDER_SAVE);
}

try{
  fs.mkdirSync(FOLDER_SAVE);
  logger.debug('Folder created:', FOLDER_SAVE);
}catch(e){
  if (e.code != 'EEXIST'){
    throw e;
  }else{
    logger.debug('Folder exists:', FOLDER_SAVE);
  }
}



/**
 * @type {string} organisation ID
 */
var org = null;
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
client.getConfig().then(config => {
  // we have received ledger config

  // extract some stuff from config
  org = config.org;
  deponent = config['account-config'][org].dep;
  endorsePeer = client._getEndorserOrgPeerId();

  logger.info('************** SIGN APP ****************');
  logger.info('API:\t%s', API);
  logger.info('USER:\t%s', USER);
  logger.info('ORG:\t%s', org);
  logger.info('DEPONENT:\t%s', deponent);
  logger.info('ENDORSER:\t%s', endorsePeer );
  logger.info('AUTOSIGN:\t%s', AUTOSIGN ? 'true' : 'false' );
  logger.info('****************************************');


  ////////////////////////////////////////////////////////////
  // Socket client
  var socket = new FabricSocketClient(API);
  socket.on('chainblock', function (block) {
    block = tools.replaceBuffer(block); // encode all buffer data with base64 string

    var iInfoArr = helper.getBlockInstructions(block, EVENT_INSTRUCTION_EXECUTED) || [];
    if(iInfoArr.length === 0) {
      return;
    }

    // sign and send instructions (use chainPromise to send requests sequentually)
    return tools.chainPromise(iInfoArr, function(iInfo){
      var instruction = helper.normalizeInstruction(iInfo.payload);
      return Promise.resolve(_processInstruction(instruction, iInfo.channel_id));
    });
  });

  socket.on('connect', function () {
    // run check on connect/reconnect, so we'll process all missed records
    _processExecutedInstructions();
  });


  // QUERY INSTRUCTIONS

  function _processExecutedInstructions(){
    logger.info('Process missed instructions');
    return client.signUp(USER)
      .then(()=>client.getAllInstructions(endorsePeer/*, INSTRUCTION_EXECUTED_STATUS*/)) // TODO: uncomment this line when 'key' will be received
      .then(function(instructionInfoList){
        // typeof instructionInfoList is {Array<{channel_id:string, instruction:instruction}>}
        logger.debug('Got %s instruction(s) to process', instructionInfoList.length);

        return tools.chainPromise(instructionInfoList, function(instructionInfo){
          var channelID = instructionInfo.channel_id;
          var instruction = instructionInfo.instruction;

          if(instruction.status !== INSTRUCTION_EXECUTED_STATUS){
            logger.warn('Skip instruction with status "%s" (not "%s")', instruction.status, INSTRUCTION_EXECUTED_STATUS);
            return;
          }

          let ret = _processInstruction(instruction, channelID)

          if(ret) {
            ret.catch(e=>{
              logger.error('_processExecutedInstructions failed:', e);
            });
          }
        });
      })
      .catch(e=>{
        logger.error(e);
      });
  }


  // PROCESS INSTRUCTION

  function _processInstruction(instruction, channel_id){
    // logger.trace('_processInstruction channel - %s:', channel_id, JSON.stringify(instruction));
    logger.trace('_processInstruction channel - %s:', channel_id,  helper.instruction2string(instruction));

    // skip already signed
    var role = helper.getRoleInInstruction(instruction, deponent);
    if(!role){
      logger.debug('Deponent %s not a member of instruction:', deponent, helper.instruction2string(instruction));
      return;
    }

    // skip already signed
    if(signer.isSigned(instruction, deponent)){
      logger.debug('Already signed by %s:', deponent, helper.instruction2string(instruction));
      return;
    }

    if(AUTOSIGN) {
      var delay = 0;// role !== 'receiver' ? 0 : 0*10000; // TODO: delay receiver execution over transferer
      logger.trace('Delay signing for %s ms', delay);
      return timeoutPromise(delay)
      .then(function(){
        // TODO: not really need always sign up
        return client.signUp(USER);
      }).then(function(/*body*/){
        var signature = signer.signInstruction(instruction, deponent);
        logger.debug('Instruction signed ', helper.instruction2string(instruction), signature);

        return client.sendSignature(channel_id, [endorsePeer], instruction, signature);
      }).then(function(result){
        logger.info('Signature sent for', helper.instruction2string(instruction), JSON.stringify(result));
      }).catch(function(e){
        logger.error('Sign error:', e);
      });
    }
    else {
      let filepath = path.join(FOLDER_SAVE, helper.instructionFilename(instruction)+'.xml');

      let fileData = role === 'transferer' ? instruction.alamedaFrom : instruction.alamedaTo;

      return writeFilePromise(filepath, JSON.parse(JSON.stringify(fileData)), {mode:MODE})
        .then(function(){
          logger.info('File write succeeded: %s', filepath);
        })
        .catch(function(e){
          logger.error('Script error:', e);
        });
    }
  }


});


function timeoutPromise(interval){
  var p = new Promise((resolve, reject) => {
    if(interval == 0) {
      process.nextTick(resolve);
    }
    else {
      var timer = setTimeout(resolve, interval);
    }
  });

  return p;
}

/**
 * @param
 */
function writeFilePromise(filepath, data, options){
  return new Promise(function(resolve, reject){
    fs.writeFile(filepath, data, options, function(err){
      if(options && options.mode){
        // options.mode not working properlty?
        fs.chmodSync(filepath, options.mode);
      }
      err ? reject(err) : resolve();
    });
  });
}