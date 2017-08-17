/**
 * Created by maksim on 8/16/17.
 */

var path = require('path');
var fs = require('fs');
var nock = require('nock');
var assert = require('assert');

var FabricRestClient = require('../../lib/FabricRestClient');





describe('FabricRestClient', function(){


  nock('http://example.com')
    .defaultReplyHeaders({
      'Content-Type' : 'application/json; charset=utf-8'
    });

  /**
   *
   */
  it('query', function(){
    var channelID  = 'channel1';
    var contractID = 'contract1';
    var peer       = 'peer1';
    var fcn        = 'fcn1';
    var args       = ['arg1', 'arg2'];


    var sampleResponse = {_id: '123ABC', _rev: '946B7D1C'};

    nock('http://example.com')
      .get('/channels/'+channelID+'/chaincodes/'+contractID)
      .query({
          peer: peer,
          fcn: fcn,
          args: JSON.stringify(args)
      })
      .reply(200, sampleResponse);

    var client = new FabricRestClient('http://example.com');

    return client.query(channelID, contractID, peer, fcn, args).then(function(body){
      // console.log('response', body);
      assert.deepEqual( body, sampleResponse);
    });

  });


  /**
   *
   */
  it('invoke', function(){
    var channelID  = 'channel1';
    var contractID = 'contract1';
    var peers      = ['peer1'];
    var fcn        = 'fcn1';
    var args       = ['arg1', 'arg2'];


    var sampleResponse = {_id: '123ABC', _rev: '946B7D1C'};

    nock('http://example.com')
      .post('/channels/'+channelID+'/chaincodes/'+contractID, {
          peers: peers,
          fcn: fcn,
          args: args
      })
      .reply(200, sampleResponse);

    var client = new FabricRestClient('http://example.com');

    return client.invoke(channelID, contractID, peers, fcn, args).then(function(body){
      // console.log('response', body);
      assert.deepEqual( body, sampleResponse);
    });

  });


  /**
   *
   */
  it('signUp', function(){
    var username = 'user1';

    var sampleToken = {
      "success":true,
      "secret":"OdpQFiJjPqwu",
      "message":"userB enrolled Successfully",
      "token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MDI5OTE5MzYsInVzZXJuYW1lIjoidXNlckIiLCJvcmdOYW1lIjoiYiIsImlhdCI6MTUwMjk1NTkzNn0.G6atv9Mvf_T-uqrZePNhLm6_PBnDbC-hjgVlrb47cD4"
    };

    nock('http://example.com')
                .post('/users', {username:username})
                .reply(200, sampleToken);

    var client = new FabricRestClient('http://example.com');

    return client.signUp(username).then(function(body){
      // console.log('response', body);
      assert.deepEqual( body, sampleToken);
    });

  });

  /**
   *
   */
  it('getConfig', function(){

    var sampleConfig = readFileJson('../artifacts/config1.json');

    nock('http://example.com')
                .get('/config')
                .reply(200, sampleConfig);

    var client = new FabricRestClient('http://example.com');

    return client.getConfig().then(function(body){
      // console.log('response', body);
      assert.deepEqual( body, sampleConfig);
    });

  });



  /**
   *
   */
  it('bearer token', function(){
    var sampleResponse = {_id: '123ABC', _rev: '946B7D1C'};

    var token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MDI5OTE5MzYsInVzZXJuYW1lIjoidXNlckIiLCJvcmdOYW1lIjoiYiIsImlhdCI6MTUwMjk1NTkzNn0.G6atv9Mvf_T-uqrZePNhLm6_PBnDbC-hjgVlrb47cD4'

    var sampleToken = {
      "success":true,
      "secret":"OdpQFiJjPqwu",
      "message":"userB enrolled Successfully",
      "token":token
    };

    nock('http://example.com')
      .post('/users', {username:'user1'})
      .reply(200, sampleToken)

      .get('/channels/channel2/chaincodes/ccode2')
      .query(true)
      .matchHeader('authorization', 'Bearer '+token)
      .reply(200, sampleResponse);


    var client = new FabricRestClient('http://example.com');

    return client.signUp('user1').then(function(body){
      return client.query('channel2', 'ccode2', 'org1/peer1', 'fn2', []).then(function(body){
        assert.deepEqual( body, sampleResponse);
      });
    });

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