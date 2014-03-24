'use strict';
angular.module('batcmsApp')
  .factory('Session', function ($resource) {
    return $resource('/api/session/');
  });
module.exports = function(){


};
