"use strict";

(function (){
  var app = angular.module('dataExplorer', []);

  app.config(function($interpolateProvider) {
    $interpolateProvider.startSymbol('{[');
    $interpolateProvider.endSymbol(']}');
  });

  app.controller('DashCtrl', function($scope, $sce, SocketService){
    $scope.vm = {};

    // runs when the socket is opened
    SocketService.onOpen(function(){
      console.log('Socket Established');
      SocketService.send({message: 'summary'});
    });

    // runs when the socket receives message
    SocketService.onMessage(function(data){
      if (data.summary) {
        $scope.vm.summary = data.summary;
      }
      if (data.columns) {
        $scope.vm.columns = data.columns;
      }
      if (data.plots) {
        $scope.vm.plots = data.plots;
      }
      console.log(data);
    });

    // runs when the socket closes or disconnects
    SocketService.onClose(function(data){
      console.error('Socket closed... will try to reconnect in 5 seconds');
    });

    $scope.getPlot = function(column) {
      if ($scope.vm.plots) {
        return $scope.vm.plots[column];
      }
    }

    $scope.viewColumn = function(col){
      $scope.vm.col = col;
      SocketService.send({column: col});
      scrollTo(col);
    }

    function scrollTo(column) {
      var target = $('#' + column);
      $("html, body").animate({ scrollTop:  $(target[0]).offset().top - 60}, 1000);
    }

  });
  app.directive('drawPlot', function() {
    return {
      scope: {
        plots: '=',
      },
      link: function(scope, el, attrs) {
        scope.$watch('plots', function(newValue, oldValue) {
          if (newValue && newValue !== oldValue) {
            angular.forEach(scope.plots, function(value, key) {
              $('table #plot_' + key).empty();
              mpld3.draw_figure('plot_' + key, value);
            });
          }
        });
      }
    }
  });
  app.factory('SocketService', ['$q', '$rootScope', function($q, $rootScope) {
    var buffer             = [];
    var onOpenCallbacks    = [];
    var onCloseCallbacks   = [];
    var onMessageCallbacks = [];
    var socket;

    var newSocket = function () {
      socket = new WebSocket('ws://'+ window.location.host +'/ws');
      socket.onopen = function() {
        buffer = buffer.filter(function(data){
          socket.send(JSON.stringify(data));
          return false;
        });
        onOpenCallbacks.forEach(function(callback){
          callback(socket);
          $rootScope.$digest();
        });
      }
      socket.onclose = function(){
        onCloseCallbacks.forEach(function(callback){
          callback();
          $rootScope.$digest();
        });
        setTimeout(newSocket, 5000);
      };
      socket.onmessage = function(event){
        if(event.type == 'message') {
          onMessageCallbacks.forEach(function(callback){
            callback.call(window, JSON.parse(event.data));
            $rootScope.$digest();
          });
        }
      };
    }

    newSocket();

    return {
      onOpen: function(callback) {
        onOpenCallbacks.push(callback);
      },
      onClose: function(callback) {
        onCloseCallbacks.push(callback);
      },
      onMessage: function(callback) {
        onMessageCallbacks.push(callback);
      },
      send: function(data) {
        if(socket.readyState !== 1) {
          buffer.push(data);
        } else {
          socket.send(JSON.stringify(data));
        }
      }
    }
  }]);

})();
