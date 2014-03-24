BatCMS
======

__Contributors:__  [John Cao](https://twitter.com/jobacao)

__License:__ [MIT](http://www.opensource.org/licenses/mit-license.php)

__Dependencies:__ MongoDB, NodeJS, AngularJS, Bower, Gulp, CamanJS, cairo, libjpeg, libpng, giflib. Since CamanJS uses NodeCanvas refer to [NodeCanvas Install Docs](https://github.com/LearnBoost/node-canvas/wiki/Installation---OSX) on how to install CamanJS, cairo, libjpeg, libpng, giflib.

## About
BatCMS hooks a MongoDB based CMS onto existing AngularJS WebApps. BatCMS modules automatically retrieves and updates MongoDB via directives. New CMS properties are defined via HTML. In context editor for CMS properties.
 

## Getting Started
1. bower install
1. npm install (If NodeCanvas breaks the solution is probably found in [NodeCanvas Install Docs](https://github.com/LearnBoost/node-canvas/wiki/Installation---OSX))
1. gulp (should bring up http://localhost:3000) in your browser

## Add BatCMS to your App

### AngularJS Modules
Setup AngularJS. 

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

    angular.module('<YOUR_APP>', [
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

### Add directives to your HTML (Jade Example) 
__Text Directive__

Text are stored as properties within MongoDB documents.

    div(cms-model="home in home")
      h5(cms-prop="home.title")
      div(cms-prop="home.info" textarea)

__Image Directive__

Images are stored as MongoDB documents. show-dim is what is set as the image height / weight. dim1,dim2,dim3 will get the image cropped and resized using CamanJS.

    span(cms-model="logo in home.photos.logoz" photo)
      span(cms-photo="logo" show-dim="103x89" dim1="103x89" alt="Logo")

__Repeating Element Directive__

Repeaters allow for an arbitrary number of documents and properties.

    div(cms-repeat='content in home.repeat')
      h4(cms-prop="content.name")
      p(cms-prop="content.info")      

__Repeating Image Directive__

    .row
      div.col-md-3(cms-repeat='pic in home.repeating-images' photo)
        span(cms-photo="pic" show-dim="103x89" dim1="103x89")
        h4(cms-prop="pic.info")

__Editing mode__

Turn on / off editing mode

    .controller('MainCtrl', function ($scope, $http) {
      $scope.editable = true;
    })
    .controller('MainCtrlRead', function ($scope, $http) {
      $scope.editable = false;
    });

__Routing__

Add routes via Express

    // Content
    app.delete('/api/content/:cuid', api.removeContent);
    app.put('/api/content', api.updateContent );
    app.post('/api/upload/photo',  api.uploadPhoto );
    app.get('/api/content/:name', api.content );
    app.get('/api/contents/:path', api.contents );


## Planned enhancements
* Better AngularJS performance
* Add EmberJS 
* Localization
* Publishing and versioning
* Secure edit mode through Passport
* Smarter directives to allow for attribute passthrough
* Tool to remove dead CMS documents and properties
* Create npm and yeoman 
