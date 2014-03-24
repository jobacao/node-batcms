'use strict';
/*global alert */
angular.module('batcms.ui',[])
  .directive('cmsModel', function ($compile,$http) {
    return {
      restrict: 'A',
      transclude: true,
      scope: {
        cmsModel: "@",
      },

      compile: function compile(element, attrs, transclude) {
        return function(scope,element,attrs) {
          // console.log( "IN cmsmodel"+attrs.cmsModel );
          scope.editable = scope.$parent.editable;
          var args = scope.cmsModel.split(/[ ]+/);
          scope.type = (attrs.photo)?1:0;

          $http.get( "/api/content/"+args[2]+"?type="+scope.type)
          .success( function(resp){
            if( resp.op !== "ok" ){
              alert("op error.");
            }else{
              if( resp.content){
                scope[args[0]] = resp.content;
              }else{
                scope[args[0]] = {name:args[2], props:{}};
                // console.log( args[0] );
              }
              transclude(scope, function(clone,innerScope) {
                element.append(clone);
              });
            }
          })
          .error(function(resp){
            alert("op error.");
          });
        };
      }

    };
  })
 .directive('cmsProp', function ($compile,$http) {
    return {
      restrict: 'A',
      scope: {
        cmsProp: '@'
      },
      link: function(scope, element, attrs) {
        var args = scope.cmsProp.split(/[.]+/);
        if(!scope.$parent[args[0]] ){ return; }
        scope.type = scope.$parent.type;
        if( attrs.textarea ){ scope.textarea = true; }

        scope.model = scope.$parent[args[0]];
        scope.editable = scope.$parent.editable;
        scope.propName = args[1];
        scope.model.props = scope.model.props || {};
        scope.model.props[scope.propName] = scope.model.props[scope.propName] || null;
        scope.model.props[scope.propName+"Label"] = scope.model.props[scope.propName+"Label"] || null;

        var tagName = element.prop('tagName');
        var propVar = "model.props['"+scope.propName+"']";
        var propLabel = "model.props['"+scope.propName+"Label']";
        var inputTag = (scope.textarea)?"textarea":"input";
        var html =   "<"+tagName+" "+
          "ng-class=\"{'cms-empty':empty, 'cms-over':mouseOver && editable}\" "+
          "ng-if=\"!showInput\" "+
          "ng-mouseleave=\"mouseOver=false\" "+
          "ng-click=\"switch($event)\" "+
          "ng-mouseover=\"mouseOver=true\" ng-bind=\""+propLabel+"\"></"+tagName+">"+

          ((!scope.textarea)?"<input type='text' ui-keypress=\"{13:'showInput=false;update($event)'}\" ":
            "<textarea msd-elastic")+
          " class='cms-edit' ng-model=\""+propVar+"\""+
          "ng-blur=\"showInput=false;update($event)\" "+
          "ng-show='showInput && editable'/> ";


        if (scope.model.props[scope.propName] && scope.model.props[scope.propName] !== ""){
          scope.empty  = false;
          scope.model.props[scope.propName+"Label"]  = scope.model.props[scope.propName];
        }else{
          scope.empty  = true;
          scope.model.props[scope.propName+"Label"]  = "Empty";
        }
        scope.showInput = false;
        scope.mouseOver = false;
        var stopEvent = function($event){
          // Prevent bubbling to showItem.
          // On recent browsers, only $event.stopPropagation() is needed
          if ($event.stopPropagation){ $event.stopPropagation(); }
          if ($event.preventDefault){ $event.preventDefault(); }
          $event.cancelBubble = true;
          $event.returnValue = false;
        };
        scope.switch = function($event){
          if( ! scope.editable ){return stopEvent($event);}
          scope.mouseOver = false;
          scope.showInput = true;
          var target = angular.element( $event.target );
          var children = target.parent().children();
          var name = target.attr('ng-bind').match( /.*\'(.*)\'.*/ )[1].replace( /Label$/,"" );
          var input = null;
          for( var i=0;i<children.length;i++) {
            var  child = angular.element(children[i]);
            // find equivalent input
            if(child.attr('ng-model') === 'model.props[\''+name+'\']' ){
              input = children[i];
              break;
            }
          }
          setTimeout( function(){ input.focus(); }, 250 );
          stopEvent($event);
        };
        scope.update = function($event){

          $http.put( "/api/content", {type:scope.type,name:scope.model.name, cuid:scope.model.cuid, folder:scope.model.folder, value:scope.model.props[scope.propName], prop:scope.propName} )
            .success( function(resp){
              if( resp.op !== "ok" ){
                alert("op error.");
              }else{
                if( scope.model.cuid !== resp.content.cuid  ){
                  scope.model.cuid = resp.content.cuid;
                  scope.model.name = resp.content.name;
                  scope.model.version = resp.content.version;
                  scope.model.type = resp.content.type;

                }
              }
            })
            .error(function(resp){
              alert("op error.");
            });
          if(scope.model.props[scope.propName] && scope.model.props[scope.propName] !== "" ){
            scope.empty = false;
            scope.model.props[scope.propName+"Label"]  = scope.model.props[scope.propName];

          } else {
            scope.empty = true;
            scope.model.props[scope.propName+"Label"]  = "Empty";
          }
        };
        // element.attr( "ng-switch", "showInput" );
        var e = $compile(html)(scope);
        element.append(e);
      }
    };
  })
  // .directive('cmsPhoto', function ($compile,$http) {
  .directive('cmsPhoto',function(uuid, $compile,$http) {
    return {
      restrict: 'A',
      // transclude:true,
      scope: {
        model: '=cmsPhoto',
        showDim: '@',
        dim1: '@',
        dim2: '@',
        dim3: '@'
      },
      compile: function compile(element, attrs, transclude) {
        return function(scope,element,attrs) {
          if( ! scope.model ){return;}

          if( scope.showDim ){
            var args = scope.showDim.split(/x/);
            scope.showWidth = args[0];
            scope.showHeight = args[1];
          }
          scope.dims = [];

          var dims = [scope.dim1, scope.dim2, scope.dim3];
          for(var i=0;i < dims.length;i++){
            var dim = dims[i];
            var matches = null;
            // console.log( "dim::"+dim );
            if( dim && (matches = dim.match(/(\d+)x(\d+)/ )) ){
              scope.dims.push( {width:matches[1], height:matches[2]} );
            }
          }

          scope.editable = scope.$parent.editable;

          scope.updateModel = function(model){
            if( scope.model.cuid !== model.cuid ){
              scope.model.cuid = model.cuid;
              scope.model.version = model.version;
              scope.model.type = model.type;
              scope.model.name = model.name;
            }
            scope.model.props = scope.model.props  || {};
            scope.model.props._locId = model.props._locId;
            scope.model.props._type = model.props._type;
            scope.model.props._dims = model.props._dims;
            scope.model.props._origFile= model.props._origFile;

          };
          scope.imgSrc = function(){

            return (scope.showDim) ?
              "/images/"+scope.model.props._locId+"-"+scope.showWidth+"-"+scope.showHeight+"."+scope.model.props._type:
              "/images/"+scope.model.props._locId+"."+scope.model.props._type;
          };
          scope.$watch("model.props['_locId']", function(){
            scope.empty =  (!scope.model  || !scope.model.props || ! scope.model.props._locId );
            if(scope.empty){
              scope.imgSrc = null;
            }else{
              scope.imgSrc = (scope.showDim) ?
              "/images/"+scope.model.props._locId+"-"+scope.showWidth+"-"+scope.showHeight+"."+scope.model.props._type:
              "/images/"+scope.model.props._locId+"."+scope.model.props._type;
            }
          }, true );

          scope.onDone = function(files,data){
            var resp = data[0].data;
            if( resp.op !== "ok" ){
              alert("op error.");
            }else{
              scope.updateModel(resp.content);
            }
          };
          scope.onGetData = function(files){
            var data = {dims:JSON.stringify(scope.dims)};
            if(scope.model.name ) { data.name = scope.model.name; }
            if(scope.model.folder) { data.folder = scope.model.folder; }
            return data;
          };
          scope.onResetFile = function(uuid){
            // console.log( "reset called."+uuid );
            scope.uuid = uuid;
          };
          var tagName = "span";
          var html =
           "<span ng-switch='editable'>"+
           "<img  ng-switch-when='false' ng-src=\"{{imgSrc}}\"/>"+
           "<lvl-file-upload "+
            //  does not work with ng-switch because of the directives DOM manipulations.
            " ng-show='editable'"+
            " auto-upload='true'"+
            " on-done=\"onDone(files, data)\""+
            " choose-file-button-style=''"+
            " choose-file-button-text=''"+
            " upload-url='/api/upload/photo'"+
            " get-additional-data=\"onGetData(files)\""+
            " on-reset-file='onResetFile(uuid)'"+
            "max-file-size-mb='12'></lvl-file-upload>"+
          "<"+tagName+" ng-switch='empty' ng-switch-when='true'>"+
            " <label "+
            " for='{{uuid}}'"+
            " ng-class=\"{'cms-over':mouseOver}\" "+
            " ng-mouseover=\"mouseOver=true;\" "+
            " ng-mouseleave=\"mouseOver=false;\" "+
            " ng-switch-when='false'"+
            " ><img  ng-src=\"{{imgSrc}}\"/>"+
            " </label>"+
            " <label "+
            " for='{{uuid}}'"+
            " class='glyphicon glyphicon-picture cms-photo-empty'"+
            " ng-switch-when='true'"+
            " ></label>"+
            " </"+tagName+"></span>";
          var e = $compile(html)(scope);
          element.append(e);
          // console.log( "html::"+html );
        };
      }
    };
  })
  .directive('cmsRepeat', function ($compile,$http) {
    return {
      restrict: 'A',
      scope: {
        cmsRepeat: '@',
      },
      compile: function compile(element, attrs, transclude) {
        return function(scope,element,attrs) {
          scope.editable = scope.$parent.editable;
          scope.empty = true;
          scope.type = (attrs.photo)?1:0;

          scope.remove = function($index){
            var content = scope.contents[$index];
            if( ! content.cuid ){
              // removeContent(content);
              scope.contents.splice($index,1);
              return;
            }
            $http.delete( "/api/content/"+content.cuid )
            .success( function(resp){
              if( resp.op !== "ok" ){
                alert("op error.");
              }else{
                scope.contents.splice($index,1);
                // removeContent(content);
              }
            })
            .error(function(resp){
              alert("op error.");
            });

          };
          scope.add = function(){
            scope.contents.push( {folder:args[2], props:{}} );
          };
          scope.containOver = function($event){
            scope.lastOver = (new Date()).getTime();
            scope.showActions = true;
          };
          scope.containLeave = function($event){
            scope.lastOver = (new Date()).getTime();
            var waitTime = 1000;
            var turnOffFunc = function(){
              // if the last action time was less than wait time do nothing.
              // needed to work for when the user mouse over and leaves back and forth.
              if( ((new Date().getTime()) - scope.lastOver) >= waitTime ){
                scope.showActions = false;
                scope.$apply();
              }
            };
            setTimeout(turnOffFunc, waitTime );
          };


          var args = attrs.cmsRepeat.split(/[ ]+/);
          var path = args[2];
          var contentId = args[0];
          // console.log( "class"+attrs.class );
          var html = "<div class='cms-repeat-contain' "+
            "ng-mouseover=\"containOver($event);\" "+
            "ng-mouseleave=\"containLeave($event);\" >"+
            "<"+element.prop('tagName')+" ng-repeat='"+contentId+" in contents' class='"+((attrs.class)?attrs.class:"")+"'><div class='cms-remove'"+
            ">"+
            element.html()+
            "<div ng-if='editable' ng-class=\"{'block-on':showActions}\" class='cms-remove-cover'><a ng-href='#' class='button-remove glyphicon glyphicon-minus' ng-click='remove($index)'></a></div>"+
            "</div>"+
            "</"+element.prop('tagName')+">"+
            "<div ng-if='editable' ng-class=\"{'block-on':showActions}\" class='cms-repeat-cover'><a ng-href='#' class='button-add glyphicon glyphicon-plus' ng-click='add()' ></a></div>"+
            "</div>";
          var e = $compile(html)(scope);
          element.replaceWith(e);

          $http.get( "/api/contents/"+path+"?type="+scope.type )
          .success( function(resp){
            if( resp.op !== "ok" ){
              alert("op error.");
            }else{
              if( resp.contents && resp.contents.length > 0 ){
                scope.contents = resp.contents;
              }else{
                scope.contents = [{folder:args[2], props:{},tmpCuid:(new Date()).getTime()}];
              }
            }
          })
          .error(function(resp){
            alert("op error.");
          });
        };
      }
    };
  });
  // .d
module.exports = function(){
};
