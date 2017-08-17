/**
 * Created by maksim on 7/15/17.
 */
"use strict";


module.exports = {
  replaceBuffer   : replaceBuffer,
  isObject        : isObject,
  chainPromise    : chainPromise
};


/**
 * @param {*} obj
 * @returns {boolean} true when obj is an object
 */
function isObject(obj) {
  return obj !== null && typeof obj === 'object';
}

/**
 * Replace 'Buffer' type with it's value, so it become an ordinary string
 * @param {*} data
 * @returns {*} data with 'Buffer' replaced with base64 encoded buffer value
 */
function replaceBuffer(data){
  if(isObject(data)){
    if (data instanceof Buffer){
      data = data.toString('base64');
    } else {
      Object.keys(data).forEach(function(propery){
        data[propery] = replaceBuffer(data[propery]);
      });
    }
  }
  return data;
}



/**
 * Run {@link param promiseFn} across each element in array sequentially
 *
 * @param {Array} array
 * @param {object} opts
 * @param {object} opts.drop:boolean - don't save result for each promise
 * @param {function} promiseFn
 * @return {Promise}
 *
 * by preliminary estimation the recursive mode takes less memory than iterative,
 * because iterative one allocates memory for the function before any async operation run
 */
function chainPromise(array, opts, promiseFn){
    if(typeof opts === "function" && !promiseFn){
      promiseFn = opts;
      opts = {};
    }

    var i = 0;
    var result = [];

    var collectorFn = opts.drop ? nope : __collectResult;
    function __collectResult(res){
      result.push(res);
    }
    function nope(){}

    function __step(){
        if(i >= array.length){
            return Promise.resolve();
        }
        let item = array[i++];
        return promiseFn(item)
            .then(collectorFn)
            .then(__step);
    }

    return __step().then(function(){
      return opts.drop ? null : result;
    });
}

