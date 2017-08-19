/**
 * Created by maksim on 8/16/17.
 */
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var helper = require('../../lib/helper');

var sampleBlock = readFileJson('../artifacts/instruction1.block.json');

describe('Block Helper', function(){

  it('getTransactionType', function(){
    assert.equal( helper.getTransactionType(sampleBlock.data.data[0]), "ENDORSER_TRANSACTION");
  });

  it('getTransactionChannel', function(){
    assert.equal( helper.getTransactionChannel(sampleBlock.data.data[0]), "a-b");
  });


  it('getBlockInstructions', function(){
    var instruction = readFileJson('../artifacts/instruction1.json');
    instruction.alamedaSignatureTo = ""; //  this field was added manually to the artifact
    var result = [{ "channel_id": "a-b", payload:instruction, type: "ENDORSER_TRANSACTION" }];

    assert.deepEqual( helper.getBlockInstructions(sampleBlock, 'Instruction.matched'), result);
    assert.deepEqual( helper.getBlockInstructions(sampleBlock, 'bla-bla'), []);
  });


  it('getInstructionsByEvent', function(){
    var instruction = readFileJson('../artifacts/instruction1.json');
    instruction.alamedaSignatureTo = ""; //  this field was added manually to the artifact
    var result = {'Instruction.matched':[{"channel_id": "a-b", payload:instruction, type: "ENDORSER_TRANSACTION" }] };

    assert.deepEqual( helper.getInstructionsByEvent(sampleBlock), result);
  });


  it('instructionFilename', function(){
    var instruction = readFileJson('../artifacts/instruction1.json');
    var result = 'RU000ABC0001-902-05-903-09-1-z-20170816-20170816';

    assert.deepEqual( helper.instructionFilename(instruction), result);
  });






});




/**
 *
 */
function readFileJson(filepath){
  if(!path.isAbsolute(filepath)){
    filepath = path.join(__dirname, filepath);
  }
  return JSON.parse(fs.readFileSync(filepath));
}

