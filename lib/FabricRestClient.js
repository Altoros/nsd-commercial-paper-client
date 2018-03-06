/**
 * Created by maksim on 8/16/17.
 */

const log4js  = require('log4js');
const logger  = log4js.getLogger('FabricRestClient');
const request = require('request');
const tools  = require('./tools');
const helper  = require('./helper');

module.exports = FabricRestClient;


const INSTRUCTION_CC = 'instruction';

const INSTRUCTION_SIGN_METHOD = 'sign';
const INSTRUCTION_STATUS_METHOD = 'status';
const INSTRUCTION_QUERY_METHOD = 'query';
const INSTRUCTION_QUERYTYPE_METHOD = 'queryByType';


/**
 * @param {string} endpoint - url of fabric rest api
 * @constructor
 */
function FabricRestClient(endpoint){
  this._ep = endpoint;
  this._token = null;
  this._config = null;
}




/**
 * @param {string} channelID
 * @param {Array<string>} endorsers - peersId (orgPeerID)
 * @param {Instruction} instruction
 * @param {string} signature
 * @return {Promise}
 */
FabricRestClient.prototype.sendSignature = function(channelID, endorsers, instruction, signature){
  var args = FabricRestClient.instructionArguments(instruction);
  args.push(signature);
  return this.invoke(channelID, INSTRUCTION_CC, endorsers, INSTRUCTION_SIGN_METHOD, args);
}


/**
 * @param {string} channelID
 * @param {Array<string>} endorsers - peersId (orgPeerID)
 * @param {Instruction} instruction
 * @param {string} status
 * @return {Promise}
 */
FabricRestClient.prototype.setInstructionStatus = function(channelID, endorsers, instruction, status){
  logger.trace('FabricRestClient.setInstructionStatus', channelID, endorsers, status, helper.instruction2string(instruction));
  var args = FabricRestClient.instructionArguments(instruction);
  args.push(status);
  return this.invoke(channelID, INSTRUCTION_CC, endorsers, INSTRUCTION_STATUS_METHOD, args);
}


/**
 * @param {string} channelID
 * @param {string} peer - (orgPeerID)
 * @param {string} [status]
 * @return {Promise<Array<Instruction>>}
 */
FabricRestClient.prototype.getInstructions = function(channelID, peer, status){
  // logger.trace('FabricRestClient.getInstructions', channelID, peer, status);
  var args = status ? [status] : [];
  var method = status ? INSTRUCTION_QUERYTYPE_METHOD : INSTRUCTION_QUERY_METHOD;
  return this.query(channelID, INSTRUCTION_CC, peer, method, args)
    .then(function(response){ return response.result; })
    .then(function(results){
      // join key and value
      return results.map(function(singleResult){
        //logger.trace('FabricRestClient.getInstructions result', JSON.stringify(singleResult));
        return Object.assign({}, singleResult.key, singleResult.value);
      });
    });
}




/**
 * @param {string} channelID
 * @param {string} peer - (orgPeerID)
 * @param {string} [status]
 * @return {Promise<Array<Instruction>>}
 */
FabricRestClient.prototype.getAllInstructions = function(peer, status){
  // logger.trace('FabricRestClient.getAllInstructions', peer, status);
  var self = this;
  return self.getChannels()
      .then(result=>result.channels)
      // filter bilateral channels
      .then(channelList=>channelList.filter(channel=>helper.isBilateralChannel(channel.channel_id)))
      .then(function(channelList){
        // logger.trace('FabricRestClient.getAllInstructions got channels:', JSON.stringify(channelList));
        return tools.chainPromise(channelList, function(channel){
            return self.getInstructions(channel.channel_id, peer, status)
              .catch(e=>{
                logger.warn(e);
                return [];
              })
              .then(function(instructionList){
                return instructionList.map(instruction=>{
                  return {
                    channel_id: channel.channel_id,
                    instruction : instruction
                  };
                });
              });
        });
      })
      .then(function(dataArr){
        // join array of array into one array
        return dataArr.reduce(function(result, data){
          result.push.apply(result, data);
          return result;
        }, []);
      })
}




/**
 * return basic fields for any instruction request
 * @static
 * @return {Array<string>}
 */
FabricRestClient.instructionArguments = function(instruction) {
  return helper.instructionArguments(instruction);
}



/**
 * @param {string} username
 * @return {Promise<TokenInfo>}
 * @more curl -X POST http://localhost:4000/users -H "content-type: application/x-www-form-urlencoded" -d 'username=Jim'
 */
FabricRestClient.prototype.getConfig = function() {
  var self = this;
  logger.debug('FabricRestClient.getConfig');
  return this._requestPromise({
      url : this._ep+'/config',
      method : "GET"
  }).then(function(config){
      // set config to local variable.
      self._config = config;
      return config;
  })
};


/**
 * @return {Promise<Array<string>>}
 */
FabricRestClient.prototype.getChannels = function(){
  return this._requestPromise({
      url : this._ep+'/channels',
      method : "GET",
      qs:{
        peer: this._getEndorserPeerId()
      },
      headers:{
        'Authorization': this._token? 'Bearer '+this._token : null
      }
  });
}


/**
 * @param {string} username
 * @return {Promise<TokenInfo>}
 * @more curl -X POST http://localhost:4000/users -H "content-type: application/x-www-form-urlencoded" -d 'username=Jim'
 */
FabricRestClient.prototype.signUp = function(username) {
  logger.debug('FabricRestClient.signUp username - %s', username);

  var payload = {
    username:username
  };
  return this._requestPromise({
      url : this._ep+'/users',
      method : "POST",
      body   : payload,
      json   : true
  }).then(body=>{
    this._token = body.token;
    return body;
  })
};

/**
 *
 */
FabricRestClient.prototype.signOut = function() {
  logger.debug('FabricRestClient.signOut');
  this._token = null;
};


/**
 * Get endorser peer
 * Also used as query peer
 * @return {string} orgPeerID
 */
FabricRestClient.prototype._getEndorserOrgPeerId = function() {
  var org = this._config.org;
  return org+'/'+this._getEndorserPeerId();
}

/**
 *
 */
FabricRestClient.prototype._getEndorserPeerId = function() {
  if(!this._config){
    throw new Error('No config. Please, fetch config with getConfig()');
  }
  var org = this._config.org;

  return Object.keys(this._config['network-config'][org]||{}).filter(k=>k.startsWith('peer'))[0];
}




/**
 * @param {string} channelID
 * @param {string} contractID
 * @param {Array<string>} peers - peersId
 * @param {string} fcn
 * @param {Array} [args]
 */
FabricRestClient.prototype.invoke = function(channelID, contractID, peers, fcn, args){
  logger.trace('FabricRestClient.invoke channel - %s, cc - %s,', channelID, contractID, JSON.stringify(peers), fcn, JSON.stringify(args) );
  args = args || [];
  var payload = {
    peers : peers,
    fcn   : fcn,
    args  : args||[]
  };
  return this._requestPromise({
      url: this._ep+'/channels/'+channelID+'/chaincodes/'+contractID,
      method: "POST",
      body   : payload,
      json   : true,
      headers:{
        'Authorization': this._token? 'Bearer '+this._token : null
      }
  });
};



/**
 * @param {string} channelID
 * @param {string} contractID
 * @param {string} peer - peerId
 * @param {string} fcn
 * @param {Array} [args]
 */
FabricRestClient.prototype.query = function(channelID, contractID, peer, fcn, args){
  logger.trace('FabricRestClient.query channel - %s, cc - %s, ', channelID, contractID, peer, fcn, JSON.stringify(args));
  args = args || [];
  var params = {
    peer : peer,
    fcn  : fcn,
    args : JSON.stringify(args||null)
  };

  return this._requestPromise({
    url: this._ep+'/channels/'+channelID+'/chaincodes/'+contractID,
    method: "GET",
    qs: params,
    headers:{
      'Authorization': this._token? 'Bearer '+this._token : null
    }
  });
};



/**
 *
 */
FabricRestClient.prototype._requestPromise = function(options){
  var self = this;
  return new Promise(function(resolve, reject){
    request(options, function(err, httpResponse, body){
      if (err) {
        return reject(err);
      } else {
        self._processResponse(httpResponse);
        return resolve(httpResponse);
      }
    });
  })
  .then(function(response){ return response.body; })
  .then(function(body){
    if( body.ok === false ){
      logger.warn('Request error:', body.message || body, '\n', options);
      throw new Error(body.message || body);
    }
    return body;
  });
};

/**
 *
 */
FabricRestClient.prototype._processResponse = function(httpResponse){
  // console.log(httpResponse.headers);
  if( (httpResponse.headers['content-type']||"").indexOf('application/json')>=0  && typeof httpResponse.body == "string" ){
    try{
      httpResponse.body = JSON.parse(httpResponse.body);
    }catch(e){
      logger.info('Cannot parse json response:', e, httpResponse.body);
    }
  }
}
