/**
 * Created by maksim on 8/16/17.
 */

const log4js  = require('log4js');
const logger  = log4js.getLogger('FabricSocketClient');

const helper  = require('./helper');
const crypto = require('crypto');



module.exports = {
  signInstruction : signInstruction,
  isSignedAll : isSignedAll,
  isSigned : isSigned,
  sign : sign
};



/**
 * @param {Instruction} instruction
 * @param {string} deponentCode
 * @return {boolean} true if the instruction already signed by the deponent
 */
function isSigned(instruction, deponentCode) {

  // detect our role (transferer/receiver)
  var signature = null;
  if(instruction.deponentFrom == deponentCode){
    signature = instruction.alamedaSignatureFrom;
  }else if(instruction.deponentTo == deponentCode){
    signature = instruction.alamedaSignatureTo;
  }

  return (signature||"").length > 0;
}

/**
 * @param {Instruction} instruction
 * @return {boolean} true if the instruction already signed by all members
 */
function isSignedAll(instruction) {
  return ((instruction.alamedaSignatureFrom||"").length > 0
      &&  (instruction.alamedaSignatureTo||"").length > 0);
}

/**
 * @param {Instruction} instruction - instruction to sign
 * @param {string} deponentCode - you deponet code. used to determine your role in the instruction (transferer/receiver)
 * @return {string} signature
 */
function signInstruction(instruction, deponentCode){

  // detect our role (transferer/receiver)
  var signData = null;
  if(instruction.deponentFrom == deponentCode){
    signData = instruction.alamedaFrom;
  }else if(instruction.deponentTo == deponentCode){
    signData = instruction.alamedaTo;
  }

  if(!signData){
    throw new Error('Cannot detect role in instruction (deponent code doesn\'t match)');
  }

  // sign
  logger.info('Signing instruction %s', helper.instruction2string(instruction) );
  var signature = sign(signData);
  logger.trace('Hash result: %s', signature);

  return signature;
}


/**
 * Sample sign function (not actually a crypto-protected)
 * @param {string} data
 * @return {string} signature
 */
function sign(data){
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
}