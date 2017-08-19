/**
 * Created by maksim on 8/16/17.
 */

const FabricSocketClient = require('./lib/FabricSocketClient');
const FabricRestClient   = require('./lib/FabricRestClient');
const log4js  = require('log4js');
log4js.configure( require('./config.json').log4js );
const logger  = log4js.getLogger('sign');

const tools   = require('./lib/tools');
const helper  = require('./lib/helper');
const signer  = require('./lib/signer');


//
const API = process.env.API;
if(!API){
  throw new Error("API is not set. Please, use environment to set it");
}

const USER = process.env.USER || 'signUser';

const EVENT_INSTRUCTION_MATCHED = 'Instruction.matched';

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
client.getConfig().then(config=>{
  // we have received ledger config

  // extract some stuff from config
  org = config.org;
  deponent = config['account-config'][org].dep;
  var endorsePeerId = Object.keys(config['network-config'][org]||{}).filter(k=>k.startsWith('peer'))[0];
  endorsePeer = org+'/'+endorsePeerId;

  logger.info('****************************************');
  logger.info('API:\t%s', API);
  logger.info('USER:\t%s', USER);
  logger.info('ORG:\t%s', org);
  logger.info('DEPONENT:\t%s', deponent);
  logger.info('ENDORSER:\t%s', endorsePeer);
  logger.info('****************************************');


  ////////////////////////////////////////////////////////////
  // Socket client
  var socket = new FabricSocketClient(API);
  socket.on('chainblock', function (block) {
    block = tools.replaceBuffer(block); // encode all buffer data with base64 string

    var iInfoArr = helper.getBlockInstructions(block, EVENT_INSTRUCTION_MATCHED) || [];
    if(iInfoArr.length==0) return;

    // sign and send instructions (use chainPromise to send requests sequentually)
    return tools.chainPromise(iInfoArr, function(iInfo){
      var instruction = helper.normalizeInstruction(iInfo.payload);
      return Promise.resolve(_processInstruction(instruction, iInfo.channel_id))
    });
  });


  // PROCESS INSTRUCTION

  function _processInstruction(instruction, channel_id){
    logger.trace('_processInstruction channel - %s:', channel_id, JSON.stringify(instruction));

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

    var delay = role != 'receiver' ? 0 : 5000; // TODO: receiver delay
    logger.trace('Delay signing for %s ms', delay);
    return timeoutPromise(delay).then(function(){
      // TODO: not really need always sign up
      return client.signUp(USER);
    }).then(function(/*body*/){
      var signature = signer.signInstruction(instruction, deponent);
      logger.debug('Signed:', signature);

      return client.sendSignature(channel_id, [endorsePeer], instruction, signature);
    }).then(function(result){
      logger.debug('Signature sent:', JSON.stringify(result));
    }).catch(function(e){
      logger.error('Sign error:', e);
    });

  }


});


function timeoutPromise(interval){
  var p = new Promise((resolve, reject)=>{
    if(interval==0){
      process.nextTick(resolve)
    } else {
      var timer = setTimeout(resolve, interval);
    }
  });
  return p;
}