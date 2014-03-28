"use strict";
var gulp = require('gulp');
var $ = require("gulp-load-plugins")();

// live reload for dev
var lr;
// var server
function notifyLivereload(event,waitTime) {
  var path = (event)?event.path:"";
  waitTime = waitTime || 0;
  // console.log("livereload."+path+",wait:"+waitTime);
  return gulp.src(path, {read: false})
      .pipe($.wait(waitTime))
      .pipe($.livereload(lr));
}
function startLivereload() {
  lr = require('tiny-lr')();
  lr.listen(35729);
}
// dist js check
gulp.task('lint', function() {
  return gulp.src(['app/scripts/*.js','app/scripts/**/.js'])
    .pipe($.jshint())
    .pipe($.jshint.reporter('default'));
});

// dist templates, injects minify versions
gulp.task('templates', ["core","scripts","styles"], function() {
    // We src all files under build
  return gulp.src(['dist/app/styles/*.*', 'dist/app/scripts/*.*'])
    // and inject them into the HTML
    .pipe($.inject('dist/app/views/index.jade', {
      addRootSlash: true,  // ensures proper relative paths
      ignorePath: '/dist/app' // ensures proper relative paths
    }))
    .pipe($.size())
    .pipe(gulp.dest('dist/app/views'));
});

// dist styles
gulp.task('compass',  function() {
  return gulp.src('app/styles/*.scss')
    .pipe($.compass({
      project: require('path').join(__dirname, '.'),
      css: '.tmp/styles',
      sass: 'app/styles',
      import_path: 'app/bower_components',
      comments: false
    }));
});
// dist styles
gulp.task('styles', ["clean","compass"], function() {
  return gulp.src('.tmp/styles/*.css')
    .pipe($.autoprefixer('last 2 versions'))
    .pipe($.minifyCss())
    .pipe($.concat('main.min.css'))
    .pipe($.rev())
    .pipe($.size())
    .pipe(gulp.dest('dist/app/styles'));
});
gulp.task('browserify', function() {
  return gulp.src(['app/scripts/app.js'])
    .pipe($.browserify({
      transform: [
        'debowerify'
      ]
    }))
    .pipe(gulp.dest('.tmp/scripts'));

});
gulp.task('scripts', ["clean","browserify"], function() {
    //single entry point to browserify
  return gulp.src(['.tmp/scripts/app.js'])
    .pipe($.ngmin())
    .pipe($.uglify())
    .pipe($.concat('app.min.js'))
    .pipe($.rev())
    .pipe($.size())
    .pipe(gulp.dest('dist/app/scripts'));
});
// remove dist
gulp.task('clean', function () {
  return gulp.src(['dist', '.tmp'], {read: false})
    .pipe($.clean());
});

// move everything else
gulp.task('core', ["clean"], function(){
  return gulp.src([
    './app/images/**/*.*',
    './app/views/**/*.*',
    './app/.htaccess',
    './app/favicon.ico',
    './app/robots.txt',
    './lib/**/*.*',
    'server.js',
    'package.json',
    // '.bowerrc',
    'bower.json'
  ],{base:'.'})
    .pipe($.size())
    .pipe(gulp.dest('./dist'));
});

// connect via browser to server
gulp.task('connect', function(){
  require('open')("http://localhost:3000", "Google Chrome", function (error) {
    if(error){
      console.log(error);
    }
  });
});
gulp.task('server', function(){
  startLivereload();
  return $.nodemon({ script:'server.js', watch: 'lib', ext:'js', ignore: [],  nodeArgs: ['--debug'] });

});
// watch for changes and notify live reload
gulp.task('watch', ["connect"], function(){
  // styles...compiles to .tmp => client reload
  gulp.watch(['app/**/*.scss'],['compass']);

  // scripts...compiles to .tmp => client reload
  gulp.watch(['app/**/*.js'],['browserify']);

  // client reload
  gulp.watch(
    ['app/**/*.jade',
    ".tmp/**/*.js",
    ".tmp/**/*.css"], notifyLivereload);

  // server restart and reload
  gulp.watch(
    [ 'lib/**/*.js'], function(event){
      // need a delay since nodemon is restarting.
      notifyLivereload(event,1500);
    });

});
// build for deployment
gulp.task('build', ["clean","lint","core","scripts","styles","templates"]);

// dev server
gulp.task('default', [ "browserify", "compass","server"], function() {
  gulp.start('watch');
});


