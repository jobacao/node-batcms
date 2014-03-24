'use strict';
var mongoose = require('mongoose'),
  Content = mongoose.model('Content'),
  Caman = require('caman').Caman,
  uuid = require("node-uuid"),
  fs = require("fs"),
  as = require("async"),
  _ = require("lodash");

var resizeImage = function( photo, newLoc, dim ,cb ){
  var sourceWidth = photo.imageWidth();
  var sourceHeight = photo.imageHeight();

  var targetWidth = dim.width;
  var targetHeight = dim.height;

  var sourceRatio = sourceWidth / sourceHeight;
  var targetRatio = targetWidth / targetHeight;

  var scale = ( sourceRatio < targetRatio )?sourceWidth / targetWidth: sourceHeight / targetHeight;

  var resizeWidth =(sourceWidth / scale);
  var resizeHeight = (sourceHeight / scale);

  var cropLeft = ((resizeWidth - targetWidth) / 2);
  var cropTop = ((resizeHeight - targetHeight) / 2);
  photo.resize({
    width: resizeWidth,
    height: resizeHeight
  });
  photo.crop(targetWidth,targetHeight, cropLeft,cropTop);
  // console.log( "photo:"+sourceWidth+"x"+sourceHeight+"=>"+resizeWidth+"x"+resizeHeight+"=>"+targetWidth+"x"+targetHeight );

  photo.render(function () {
    photo.save(newLoc);
    cb();
  });
};

var processImages = function( path, dims,cb ){
  if( ! dims || dims.length === 0 ){return cb();}
  Caman(path, function () { // jshint ignore:line
    var photo = this;
    var calls = _.map( dims, function(dim){
      return function(cb){
        dim.width = parseInt(dim.width);
        dim.height = parseInt(dim.height);
        var matches = path.match(/(.*)[.](.*)$/);
        resizeImage( photo, matches[1]+"-"+dim.width+"-"+dim.height+"."+matches[2],dim,cb);
      };
    });
    as.parallel( calls,function(err,results){
      cb(err);
    } );
  });

};
exports.uploadPhoto = function( req,res,next){
  _.forEach(req.files, function(file){
    var locId = uuid.v1();
    var dims = ( req.body.dims )? JSON.parse(req.body.dims):null;
    var dataDir = Content.photoDir(); //__dirname+"/../../data";
    // console.log( "data"+dataDir );
    var fType = file.type.replace(/.*\//,"");
    var filePath = dataDir+"/"+locId+"."+fType;
    require('mv')(file.path, filePath,
      function(err) {
      if(err) {
        console.log( "error:"+err);
        return res.json( {op:"error"});
      }
      // walk through dim and process files.
      processImages( filePath, dims,function(err){
        if(err) {
          console.log( "error:"+err);
          return res.json( {op:"error"});
        }
        // Save image.
        var content = {name:(req.body.folder)?req.body.folder+"."+locId:req.body.name, type:Content.PhotoType,version:0}; //,
        Content.upsert(content,{}, function(err,content){
          if(err) {
            console.log( "error:"+err);
            return res.json( {op:"error"});
          }
          // clean up existing files
          content.cleanup( function(err){
            if(err) {
              console.log( "error:"+err);
              return res.json( {op:"error"});
            }
            // doing this in cases where there are existing non image properties
            as.parallel([
              function(cb){ content.updateProp( '_dims', dims, cb ); },
              function(cb){ content.updateProp( '_locId', locId, cb ); },
              function(cb){ content.updateProp( '_origFile', file.originalFilename, cb ); },
              function(cb){ content.updateProp( '_type', fType, cb ); },
            ],function(err,results){
              if(err) {
                console.log( "error:"+err);
                return res.json( {op:"error"});
              }
              res.json({op:"ok",content:content.safeJson()});
            });
          });

        });

      });
    });

  });

};


exports.removeContent = function(req, res, next) {
  // Content.remove({ _id:Content.idFromHash(req.params.cuid) }, function (err) {
  //   if(err) {
  //     console.log( "error:"+err);
  //     return res.json( {op:"error"});
  //   }
  //   res.json( { op:"ok" } );
  // });
  Content.removeCleanup(Content.idFromHash(req.params.cuid), function (err) {
    if(err) {
      console.log( "error:"+err);
      return res.json( {op:"error"});
    }
    res.json( { op:"ok" } );
  });

};
exports.updateContent = function(req, res, next) {
  var upsertFunc = function(err,content){
    if(err) {
      console.log( "error:"+err);
      return res.json( {op:"error"});
    }
    if(!content){
      console.log( "content not found");
      return res.json( {op:"error"});
    }
    // update property
    content.updateProp( req.body.prop, req.body.value, function(err){
      if(err) {
        console.log( "error:"+err);
        return res.json( {op:"error"});
      }
      res.json( { op:"ok", content:(content)?content.safeJson():null});
    });
  };
  console.log( "type:::"+req.body.type );
  if(req.body.cuid){
  // cuid ... find object
    Content.findOne({_id:Content.idFromHash(req.body.cuid)},upsertFunc);
  }else if (req.body.folder){
    // folder....create object under the folder.
    Content.upsert({name:req.body.folder+"."+(Math.floor((Math.random()*1000000)+1)),
      type:(req.body.type)?req.body.type:Content.SimpleType,version:0},{},upsertFunc);
  }else{
    // default by content foreign keys
    Content.upsert({name:req.body.name,
      type:(req.body.type)?req.body.type:Content.SimpleType,version:0},{},upsertFunc);
  }
};
exports.contents = function(req, res, next) {
  var opts = {};
  if( req.query.type ) opts.type = req.query.type;
  Content.findByPath(req.params.path+".*",opts,function(err,contents){
    if(err) {
      console.log( "error:"+err);
      return res.json( {op:"error"});
    }
    res.json( { op:"ok", contents:(contents)? _.map( contents, function(content){ return content.safeJson();}):null});
  });
};


exports.content = function(req, res, next) {
  var opts = {};
  if( req.query.type ) opts.type = req.query.type;
  Content.findByPath(req.params.name,opts,function(err,content){
    if(err) {
      console.log( "error:"+JSON.stringify(err));
      return res.json( {op:"error"});
    }
    res.json( { op:"ok", content:(content)?content.safeJson():null});
  });
};



// exports.awesomeThings = function(req, res) {
//   console.log("awesomeThings");
//   return Thing.find(function (err, things) {
//     if (!err) {
//       return res.json(things);
//     } else {
//       return res.send(err);
//     }
//   });
// };
