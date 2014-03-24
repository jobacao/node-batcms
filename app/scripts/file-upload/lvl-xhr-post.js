// from http://jasonturim.wordpress.com/2013/09/12/angularjs-native-multi-file-upload-with-progress/

var module;

try {
    module = angular.module('lvl.services');
} catch (e) {
    module  = angular.module('lvl.services', []);
}

module.factory('fileUploader', ['$rootScope', '$q', function($rootScope, $q) {
  var svc = {
    // JC - added postSingle, postMulti
    postSingle: function(idx, uploadUrl, file, data, progressCb,doneCb,errorCb) {
      var xhr = new XMLHttpRequest();

      xhr.upload.onprogress = function(e) {
        $rootScope.$apply (function() {
          var percentCompleted;
            if (e.lengthComputable) {
              percentCompleted = Math.round(e.loaded / e.total * 100);
              if (progressCb) {
                progressCb(idx,percentCompleted, e.loaded, e.total );
              }
            }
        });
      };


      xhr.onload = function(e) {
        $rootScope.$apply (function() {
          var ret = {
            file: file,
            data: angular.fromJson(xhr.responseText)
          };
          // deferred.resolve(ret);
          doneCb(ret)
        })
      };



      xhr.upload.onerror = function(e) {
        var msg = xhr.responseText ? xhr.responseText : "An unknown error occurred posting to '" + uploadUrl + "'";
        $rootScope.$apply (function() {
          errorCb(msg);
        });
      }

      var formData = new FormData();

      if (data) {
        Object.keys(data).forEach(function(key) {
          formData.append(key, data[key]);
        });
      }

      // for (var idx = 0; idx < files.length; idx++) {
      formData.append(file.name, file);
      // }

      xhr.open("POST", uploadUrl);
      xhr.send(formData);
    },
    retCb: function(responses,deferred, errorMsg ){
      if( errorMsg ){
        deferred.reject( errorMsg );
      }else{
        // var ret = {
        //  files: files,
        //  data: ""
        // };
        deferred.resolve(responses);
      }
    },
    postMulti: function(files, data, progressCb) {
      var xhrReq = this;
      return {
        to: function(uploadUrl)
        {
          var deferred = $q.defer()
          if (!files || !files.length) {
            deferred.reject("No files to upload");
            return;
          }

          var totalSize = 0;
          var loadedFiles = [];
          for (var idx = 0; idx < files.length; idx++) {
            // formData.append(files[idx].name, files[idx]);
            totalSize += files[idx].size;
            loadedFiles[idx] = { loaded:0, total:0 };
          }
          errorMsg = null;
          completed = 0;
          responses = [];

          for (var idx = 0; idx < files.length; idx++) {
            // totalSize += files[idx].size;
            xhrReq.postSingle( idx, uploadUrl, files[idx],data,
              function(idx,percentCompleted, loaded, total ){
                loadedFiles[idx] = { loaded:loaded, total:total };


                var loadedTotal = 0
                for (var i= 0; i< loadedFiles.length; i++) {
                  loadedTotal += loadedFiles[i].loaded
                }
                var percentCompleted =  loadedTotal / totalSize * 100;
                // console.log( idx+") "+loaded+" of "+total+" => "+loadedTotal+"/"+totalSize+"="+percentCompleted);
                // Hack
                if((percentCompleted) >= 100){
                  percentCompleted = 100
                }
                if (progressCb) {
                  progressCb(percentCompleted);
                } else if (deferred.notify) {
                  deferred.notify(percentCompleted);
                }

              },
              // array of {update[ok,error], [data[file,data],msg]}
              function(ret){
                // good.
                completed += 1;
                responses.push( ret );
                if( completed == files.length ){
                  xhrReq.retCb( responses,deferred,errorMsg);
                }
              },
              function(error){
                // break
                errorMsg = error;
                completed += 1;
                responses.push( { update:"error", msg:error} );
                if( completed == files.length ){
                  xhrReq.retCb( responses,deferred,errorMsg);
                }

              }
            );
            // if( errorMsg ){
            //  break;
            // }
          }





              // deferred.resolve(ret);
              //              deferred.reject(msg);


          // var xhr = new XMLHttpRequest();
          // xhr.upload.onprogress = function(e) {
          //  $rootScope.$apply (function() {
          //    var percentCompleted;
          //      if (e.lengthComputable) {
          //          percentCompleted = Math.round(e.loaded / e.total * 100);
          //          if (progressCb) {
          //            progressCb(percentCompleted);
          //          } else if (deferred.notify) {
          //            deferred.notify(percentCompleted);
          //        }
          //      }
          //  });
          // };

          // xhr.onload = function(e) {
          //  $rootScope.$apply (function() {
          //    var ret = {
          //      files: files,
          //      data: angular.fromJson(xhr.responseText)
          //    };
          //    deferred.resolve(ret);
          //  })
          // };

          // xhr.upload.onerror = function(e) {
          //  var msg = xhr.responseText ? xhr.responseText : "An unknown error occurred posting to '" + uploadUrl + "'";
          //  $rootScope.$apply (function() {
          //    deferred.reject(msg);
          //  });
          // }

          // var formData = new FormData();

          // if (data) {
          //  Object.keys(data).forEach(function(key) {
          //    formData.append(key, data[key]);
          //  });
          // }

          // for (var idx = 0; idx < files.length; idx++) {
          //  formData.append(files[idx].name, files[idx]);
          // }

          // xhr.open("POST", uploadUrl);
          // xhr.send(formData);

          return deferred.promise;
        }
      };
    },
    post: function(files, data, progressCb) {

      return {
        to: function(uploadUrl)
        {
          var deferred = $q.defer()
          if (!files || !files.length) {
            deferred.reject("No files to upload");
            return;
          }

          var xhr = new XMLHttpRequest();
          xhr.upload.onprogress = function(e) {
            $rootScope.$apply (function() {
              var percentCompleted;
                if (e.lengthComputable) {
                    percentCompleted = Math.round(e.loaded / e.total * 100);
                    if (progressCb) {
                      progressCb(percentCompleted);
                    } else if (deferred.notify) {
                      deferred.notify(percentCompleted);
                  }
                }
            });
          };

          xhr.onload = function(e) {
            $rootScope.$apply (function() {
              var ret = {
                files: files,
                data: angular.fromJson(xhr.responseText)
              };
              deferred.resolve(ret);
            })
          };

          xhr.upload.onerror = function(e) {
            var msg = xhr.responseText ? xhr.responseText : "An unknown error occurred posting to '" + uploadUrl + "'";
            $rootScope.$apply (function() {
              deferred.reject(msg);
            });
          }

          var formData = new FormData();

          if (data) {
            Object.keys(data).forEach(function(key) {
              formData.append(key, data[key]);
            });
          }

          for (var idx = 0; idx < files.length; idx++) {
            formData.append(files[idx].name, files[idx]);
          }

          xhr.open("POST", uploadUrl);
          xhr.send(formData);

          return deferred.promise;
        }
      };
    }
  };

  return svc;
}]);
module.exports = function(){
};
