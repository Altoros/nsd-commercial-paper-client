/**
 * Created by maksim on 8/16/17.
 */
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var signer = require('../../lib/signer.js');

var sampleBlock = readFileJson('../artifacts/instruction1.block.json');

var instruction = readFileJson('../artifacts/instruction1.json');

describe('Signer', function(){

  it('signInstruction', function(){
    var sig = 'ffaea6edc32a7129b6297f89a30c8c679101b18008f3e76b83e91e8828e1ba63';
    assert.equal( signer.signInstruction(instruction, 'CA9861913023'), sig);

    var sig = '75e243a66e9538d81a5176535bb524911ffa9a69bd1e37fac4ec1455404dd4ff';
    assert.equal( signer.signInstruction(instruction, 'DE000DB7HWY7'), sig);
  });

  it('isSigned', function(){
    assert.equal( signer.isSigned(instruction, 'CA9861913023'), false);
    assert.equal( signer.isSigned(instruction, 'DE000DB7HWY7'), true);
  });

  it('isSignedAll', function(){
    assert.equal( signer.isSignedAll(instruction), false);
    instruction.alamedaSignatureFrom = "asdads";
    assert.equal( signer.isSignedAll(instruction), true);
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

