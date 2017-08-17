/**
 * Created by maksim on 8/16/17.
 */

const util = require('util');

module.exports = {
  getBlockInstructions  : getBlockInstructions,
  getInstructionsByEvent  : getInstructionsByEvent,
  getTransactionChannel : getTransactionChannel,
  getTransactionType  : getTransactionType,
  getBlockActionEvent : getBlockActionEvent,
  instruction2string  : instruction2string,
  instructionFilename : instructionFilename
};


const TYPE_ENDORSER_TRANSACTION = 'ENDORSER_TRANSACTION';


/**
 *
 */
function getInstructionsByEvent(block){
  var result = {}; // eventName => array of Instructions

  block.data.data.forEach(function(blockData){

    var blockType = getTransactionType(blockData);
    var channel   = getTransactionChannel(blockData);
    var type      = getTransactionType(blockData);

    if (type === TYPE_ENDORSER_TRANSACTION) {

      blockData.payload.data.actions.forEach(function(action) {

        var event = getBlockActionEvent(action)||{};
        var eventName = event.event_name || 'default';
        result[eventName] = result[eventName] || [];

        var payload = Buffer.from(event.payload, 'base64').toString();
        // var payload = event.payload.toString();

        try{
          payload = JSON.parse(payload);
        }catch(e){
          // it's ok, can be not a json
        }

        result[eventName].push({
          channel_id  : channel,
          type    : blockType,
          payload : payload
        });

      }); // thru action elements
    }
  }); // thru block data elements
  return result;
}

/**
 * Transform block to simplier represntation
 * return array of {channel_id:string, instruction:Instruction}
 */
function getBlockInstructions(block, eventName){
  var result = [];

  block.data.data.forEach(function(blockData){

    var blockType = getTransactionType(blockData);
    var channel   = getTransactionChannel(blockData);
    var type      = getTransactionType(blockData);

    if (type === TYPE_ENDORSER_TRANSACTION) {

      blockData.payload.data.actions.forEach(function(action) {

        var event = getBlockActionEvent(action)||{};

        if(event.event_name === eventName) {
          var payload = Buffer.from(event.payload, 'base64').toString();
          // var payload = event.payload.toString();

          try{
            payload = JSON.parse(payload);
          }catch(e){
            // it's ok, can be not a json
          }


          result.push({
            channel_id  : channel,
            type    : blockType,
            payload : payload
          });
        }

      }); // thru action elements
    }
  }); // thru block data elements
  return result;
}


function getTransactionType(blockData) {
  return blockData.payload.header.channel_header.type;
}


function getTransactionChannel(blockData) {
  return blockData.payload.header.channel_header.channel_id;
}

function getBlockActionEvent(blockDataAction) {
  return blockDataAction.payload.action.proposal_response_payload.extension.events;
}




/**
 *
 */
function instruction2string(instruction){
  // var instruction = this;
  return util.format('Instruction: %s/%s%s -> %s/%s%s (%s)',
    instruction.deponentFrom,
    instruction.transferer.account,
    instruction.transferer.division,

    instruction.deponentTo,
    instruction.receiver.account,
    instruction.receiver.division,

    instruction.reference
  );
}


/**
 *
 */
function instructionFilename(instruction){
  // var instruction = this;
  return util.format('%s-%s-%s-%s-%s-%s-%s',
    instruction.deponentFrom,
    instruction.transferer.account,
    instruction.transferer.division,

    instruction.deponentTo,
    instruction.receiver.account,
    instruction.receiver.division,

    instruction.reference
  );
}