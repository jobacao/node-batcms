// from http://jasonturim.wordpress.com/2013/09/12/angularjs-native-multi-file-upload-with-progress/
angular
    .module("lvl.directives.fileupload", ['lvl.services'])
    // JC - hack since i was getting major issues with nodevalue not defined....
    .directive('lvlFileUpload', ['uuid', 'fileUploader', function(uuid, fileUploader) {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                chooseFileButtonText: '@',
                chooseFileButtonStyle: '@',
                uploadFileButtonText: '@',
                uploadFileButtonStyle: '@',
                // uuid: '@',
                uploadUrl: '@',
                maxFiles: '@',
                maxFileSizeMb: '@',
                autoUpload: '@',
                getAdditionalData: '&',
                onProgress: '&',
                onDone: '&',
                onResetFile: '&',
                onError: '&'
            },
            template: '<span>' +
                '<input type="file" style="opacity:0" />' +
                // HACK - not sure why the scope is different for array of file uploads ...
                '<label ng-class="chooseFileButtonStyle" ng-bind="chooseFileButtonText" ng-click="choose()"/>' +
                '<button ng-class="uploadFileButtonStyle" ng-bind="chooseFileButtonText" ng-show="showUploadButton" ng-click="upload()"/>' +

                // '<label class="{{ chooseFileButtonStyle }}" ng-click="choose()">{{chooseFileButtonText}}</label>' +
                // '<button class="{{ uploadFileButtonStyle }}" ng-show="showUploadButton" ng-click="upload()">{{uploadFileButtonText}}</button>' +
                '</span>',
            compile: function compile(tElement, tAttrs, transclude) {
                var fileInput = angular.element(tElement.children()[0]);
                var fileLabel = angular.element(tElement.children()[1]);

                if(!tAttrs.chooseFileButtonStyle) {
                    tAttrs.chooseFileButtonStyle = 'lvl-choose-button';
                }

                if(!tAttrs.uploadFileButtonStyle) {
                    tAttrs.uploadFileButtonStyle = 'lvl-upload-button';
                }

                if (!tAttrs.maxFiles) {
                    tAttrs.maxFiles = 1;
                    fileInput.removeAttr("multiple")
                } else {
                    fileInput.attr("multiple", "multiple");
                }

                if (!tAttrs.maxFileSizeMb) {
                    tAttrs.maxFileSizeMb = 50;
                }

                var fileId = uuid.new(); //(tAttrs.uuid)?tAttrs.uuid:uuid.new();
                fileInput.attr("id", fileId);
                fileLabel.attr("for", fileId);

                return function postLink(scope, el, attrs, ctl) {
                    scope.files = [];
                    scope.showUploadButton = false;
                    if( scope.onResetFile ){ scope.onResetFile({uuid:fileId});}

                    el.bind('change', function(e) {
                        if (!e.target.files.length) return;

                        scope.files = [];
                        var tooBig = [];
                        if (e.target.files.length > scope.maxFiles) {
                            raiseError(e.target.files, 'TOO_MANY_FILES', "Cannot upload " + e.target.files.length + " files, maxium allowed is " + scope.maxFiles);
                            return;
                        }

                        for (var i = 0; i < scope.maxFiles; i++) {
                            if (i >= e.target.files.length) break;

                            var file = e.target.files[i];
                            scope.files.push(file);

                            if (file.size > scope.maxFileSizeMb * 1048576) {
                                tooBig.push(file);
                            }
                        }

                        if (tooBig.length > 0) {
                            raiseError(tooBig, 'MAX_SIZE_EXCEEDED', "Files are larger than the specified max (" + scope.maxFileSizeMb + "MB)");
                            return;
                        }

                        if (scope.autoUpload && scope.autoUpload.toLowerCase() == 'true') {
                            scope.upload();
                        } else {
                            scope.$apply(function() {
                                scope.showUploadButton = true;
                            })
                        }
                    });

                    scope.upload = function() {
                        var data = null;
                        if (scope.getAdditionalData) {
                            // console.log("upload files:"+scope.files);
                            data = scope.getAdditionalData({files:scope.files}); // JC https://github.com/logicbomb/lvlFileUpload/issues/5
                        }

                        // JC - post to postMulti
                        if (angular.version.major <= 1 && angular.version.minor < 2 ) {
                            //older versions of angular's q-service don't have a notify callback
                            //pass the onProgress callback into the service
                            fileUploader
                                .postMulti(scope.files, data, function(complete) { scope.onProgress({percentDone: complete}); })
                                .to(scope.uploadUrl)
                                .then(function(ret) {
                                    scope.onDone({files: scope.files, data: ret});
                                }, function(error) {
                                    scope.onError({files: scope.files, type: 'UPLOAD_ERROR', msg: error});
                                })
                        } else {
                            fileUploader
                                .postMulti(scope.files, data)
                                .to(scope.uploadUrl)
                                .then(function(ret) {
                                    scope.onDone({files: scope.files, data: ret});
                                }, function(error) {
                                    scope.onError({files: scope.files, type: 'UPLOAD_ERROR', msg: error});
                                },  function(progress) {
                                    scope.onProgress({percentDone: progress});
                                });
                        }

                        resetFileInput();
                    };

                    function raiseError(files, type, msg) {
                        scope.onError({files: files, type: type, msg: msg});
                        resetFileInput();
                    }

                    function resetFileInput() {
                        var parent = fileInput.parent();
                        // console.log( "fileinput"+fileInput );
                        // console.log( "fileinput-parent"+fileInput.parent.remove );
                        fileInput.remove();
                        var input = document.createElement("input");
                        var attr = document.createAttribute("type");
                        attr.nodeValue = "file";
                        input.setAttributeNode(attr);

                        var inputId = uuid.new();
                        attr = document.createAttribute("id");
                        attr.nodeValue = inputId;
                        input.setAttributeNode(attr);

                        attr = document.createAttribute("style");
                        attr.nodeValue = "opacity: 0;display:inline;width:0";
                        input.setAttributeNode(attr);



                        if (scope.maxFiles > 1) {
                            attr = document.createAttribute("multiple");
                            attr.nodeValue = "multiple";
                            input.setAttributeNode(attr);
                        }

                        fileLabel.after(input);
                        fileLabel.attr("for", inputId);

                        fileInput = angular.element(input);

                        if( scope.onResetFile ){ scope.onResetFile({uuid:inputId});}
                    }
                }
            }
        }
    }]);
module.exports = function(){
};
