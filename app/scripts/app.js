"use strict";
require('angular');
require('angular-resource');
require('angular-cookies');
require('angular-sanitize');
require('angular-route');
require('angular-ui-utils');
require('angular-elastic');

require('./file-upload/lvl-uuid');
require('./file-upload/lvl-file-upload');
require('./file-upload/lvl-xhr-post');
require('./ui/batcms-ui');

angular.module('batcmsApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'ui.utils',
  'monospaced.elastic',
  'lvl.directives.fileupload',
  'batcms.ui'
])
  .config(function ($routeProvider, $locationProvider, $httpProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'partials/main',
        controller: 'MainCtrl'
      })
      .when('/read', {
        templateUrl: 'partials/main',
        controller: 'MainCtrlRead'
      })
      .when('/login', {
        templateUrl: 'partials/login',
        controller: 'LoginCtrl'
      })
      .when('/signup', {
        templateUrl: 'partials/signup',
        controller: 'SignupCtrl'
      })
      .when('/settings', {
        templateUrl: 'partials/settings',
        controller: 'SettingsCtrl',
        authenticate: true
      })
      .otherwise({
        redirectTo: '/'
      });

    $locationProvider.html5Mode(true);

    // Intercept 401s and redirect you to login
    $httpProvider.interceptors.push(['$q', '$location', function($q, $location) {
      return {
        'responseError': function(response) {
          if(response.status === 401) {
            $location.path('/login');
            return $q.reject(response);
          }
          else {
            return $q.reject(response);
          }
        }
      };
    }]);
  })
  .run(function ($rootScope, $location, Auth) {

    // Redirect to login if route requires auth and you're not logged in
    $rootScope.$on('$routeChangeStart', function (event, next) {

      if (next.authenticate && !Auth.isLoggedIn()) {
        $location.path('/login');
      }
    });
  });

require('./controllers/login');
require('./controllers/main');
require('./controllers/navbar');
require('./controllers/settings');
require('./controllers/signup');
require('./directives/mongooseError');
// require('./directives/cms');
require('./services/auth');
require('./services/session');
require('./services/user');
