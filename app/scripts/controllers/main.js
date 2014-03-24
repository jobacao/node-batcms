'use strict';

angular.module('batcmsApp')
  .controller('MainCtrl', function ($scope, $http) {
    $scope.editable = true;
  })
  .controller('MainCtrlRead', function ($scope, $http) {
    $scope.editable = false;
  });

module.exports = function(){

};
