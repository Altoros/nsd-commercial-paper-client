/**
 * Created by maksim on 8/16/17.
 */

const FabricSocketClient = require('./lib/FabricSocketClient');
const FabricRestClient   = require('./lib/FabricRestClient');
const log4js  = require('log4js');
log4js.configure( require('./config.json').log4js );
const logger  = log4js.getLogger('index');

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
      return Promise.resolve(_processInstruction(iInfo.payload, iInfo.channel_id));
    });
  });


  // PROCESS INSTRUCTION

  function _processInstruction(instruction, channel_id){
    // TODO: not really need always sign up
    return client.signUp(USER).then(function(/*body*/){
      // skip already signed
      if(signer.isSigned(instruction, deponent)){
        logger.debug('Already signed by %s:', deponent, helper.instruction2string(instruction));
        return;
      }

      var signature = signer.signInstruction(instruction, deponent);
      logger.debug('Signed:', signature);

      return client.sendSignature(channel_id, [endorsePeer], instruction, signature);
    }).then(function(result){
      logger.debug('signature sent:', JSON.stringify(result));
    });
  }


});
