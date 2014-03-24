'use strict';
var mongoose = require('mongoose'),
  Hashids = require('hashids'),
  hashids = new Hashids("8933jdksl8339dd.8=893--CHANGE-ME"),
  Mixed = mongoose.Schema.Types.Mixed,
  as = require("async"),
  _ = require("lodash"),
  fs = require("fs"),
  Schema = mongoose.Schema;

var Schema = new Schema({
  version: {
    type: Number,
    default: 0,
    required: true
  },
  type: {
    type: Number,
    default: 0,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  // value:String,
  // hash of name and arbitrary values
  props: {
    type: Mixed
  }
});
var Collection  = "Content";
// Index and Unique
Schema.index({version: 1, name: 1}, {unique: true});
// Unique Errors
Schema.plugin(require('mongoose-unique-validator'));

// content types
Schema.statics.FolderType = 2;
Schema.statics.PhotoType = 1;
Schema.statics.SimpleType = 0;

// cuidids
Schema.statics.photoDir = function(){
  return __dirname+"/../../data/images";
};

Schema.statics.idFromHash = function(hash){
  return hashids.decryptHex(hash);
};
Schema.statics.hashId = function(id){
  return hashids.encryptHex(id);
};
// json for api transport
Schema.methods.safeJson = function(){
  return {cuid:this.cuid(),value:this.value,name:this.name,version:this.version,
    type:this.type,props:this.props};
};
// hash of id. placeholder for future sharding.
Schema.methods.cuid = function(){
  return ( this.id )?this.model(Collection).hashId( this.id ):null;
};
// create folders, silently fails if it exists
Schema.statics.removeCleanup = function(id,cb){
  // Content.remove({ _id:Content.idFromHash(req.params.cuid) }, function (err) {
  //   if(err) {
  //     console.log( "error:"+err);
  //     return res.json( {op:"error"});
  //   }
  //   res.json( { op:"ok" } );
  // });
  this.findOne( {_id:id},function(err,content){
    if(err){return cb(err);}
    content.remove( function(err){
      cb(err);
    });
  });
};
Schema.statics.createFolders = function(name,version,opts,cb){
  if(!name || name === "" ) return cb();
  // create folders
  var Model = this;
  var folder = new Model({name:name,version:version,type:this.FolderType});

  folder.save( function(error,content){
    // dups are ok.
    if(error && (!error.err || ! error.err.match("E11000"))) return cb(error);
    if( name.match( /\./ ) ){
      // remove last one out
      name = name.replace( /\.[^.]*$/, '' );
      return Model.createFolders(name,version,opts,cb);
    }else{
      return cb(error,null);
    }
  });
};

Schema.post('remove', function (doc) {
  console.log('%s has been removed', doc._id);
  doc.cleanup(function(err){
    if( err ){
      console.log(err);
      throw err;
    }
  });
});
// finds
// find by given path
// path: yyy.zzz => content object, yyy.zzz.* => list of content objects where zzz is the parent., null, * => root
Schema.statics.findByPath = function(name,opts,cb){
  // we want one level under only.
  if(name){name=name.replace(/[*]/,'[^.]*');}
  name = ( name === null || name === "" || name === "*" ) ? "^*" : name;
  opts = opts || {};

  var findOpts = {name: new RegExp( "^"+name+"$", "i")};
  if(opts.type) findOpts.type = opts.type;
  // want children or no?
  var find = ( name.match( /[*]$/ ) ) ? this.find.bind(this) : this.findOne.bind(this) ;
  name = name.replace( /\./, '\\.' ); // switch to regex .
  name = name.replace( /\*$/, '[^.]+$' ); // switch to regex notation
  find(findOpts, function(err, content) {
    return cb(err,content);
  });
};

// update property
// db.users.update ({_id: '123'}, {$set: {"friends.0.emails.0.email" : '2222'} });
// db.users.update ({_id: '123'}, {$set: {"friends.0.emails.0.email" : '2222'} });
Schema.methods.photoPath = function( dim ){
  if( (this.type !== this.constructor.PhotoType) || !this.props || !this.props._locId ){return null;}
  return ( ! dim )?
    this.constructor.photoDir()+"/"+this.props._locId+"."+this.props._type:
    this.constructor.photoDir()+"/"+this.props._locId+"-"+dim.width+"-"+dim.height+"."+this.props._type;
};
Schema.methods.cleanup = function( cb ){
  // console.log( "cleanup called"+JSON.stringify(this) );
  if( (this.type !== this.constructor.PhotoType) || !this.props || !this.props._locId ){return cb();}
  // photo clean up
  // var calls = [];
  var content = this;
  var removeFile = function( path, cb ){
    // console.log( "removing path"+path);
    if( !fs.existsSync(path) ){return cb();}
    fs.unlink( path, function(error){
      // console.log( "removed path"+path);
      cb(error);
    });
  };

  var calls = _.map(this.props._dims, function(dim){
    return function(cb){
      removeFile( content.photoPath(dim), cb );
    };
  });
  calls.push(function(cb){
    removeFile( content.photoPath(), cb );
  });
  as.parallel(calls,function(err,results){
    cb(err);
  });

};
Schema.methods.updateProp = function(prop,propValue,cb){
  this.props = this.props || {};
  this.props[prop] = propValue;
  if( this.id ){
    var opts = {};
    opts["props."+prop] = propValue;
    // console.log('updating id.'+this.id+JSON.stringify(opts));
    var id = this.id;
    this.constructor.update({_id:id}, { $set:opts}, {}, function(err,count){
      if( err ) return cb(err);
      if( count === 0 ) return  cb(new Error("Could not find content for id:"+id));
      return cb();
    });
  }else{
    cb();
  }
};


// insert or update the content
Schema.statics.upsert = function(content,opts,cb){
  opts = opts || {};
  var Model = this;
  if( content.name.match(/[.]/) ){
    var folder = content.name.replace( /\.[^.]*$/, '' );
    Model.createFolders( folder, content.version, opts, function(error){
      // hack to find a duplicate error.
      if(error && (!error.err || ! error.err.match("E11000"))) return cb(error);
      Model.findOneAndUpdate({version:content.version, name:content.name,type:content.type},
        content, {upsert: true}, function(err,content){
        // console.log( "error found:"+err);
        return cb(err,content);
      });
    });

  }else{
    Model.findOneAndUpdate({version:content.version, name:content.name,type:content.type},
      content, {upsert: true}, function(err,content){
      // console.log( "error found:"+err);
      return cb(err,content);
    });

  }

};

module.exports = mongoose.model(Collection, Schema);
