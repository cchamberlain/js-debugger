var Client, Debugger, Event, EventEmitter, ProcessManager, Promise, R, childprocess, logger, psTree,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

R = require('ramda');

psTree = require('ps-tree');

Promise = require('bluebird');

Client = require('_debugger').Client;

childprocess = require('child_process');

EventEmitter = require('events').EventEmitter;

Event = require('geval/event');

logger = require('./logger');

ProcessManager = (function(superClass) {
  extend(ProcessManager, superClass);

  function ProcessManager(atom1) {
    this.atom = atom1 != null ? atom1 : atom;
    ProcessManager.__super__.constructor.call(this);
    this.process = null;
  }

  ProcessManager.prototype.start = function(file) {
    return this.cleanup().then((function(_this) {
      return function() {
        var appArgs, appPath, args, isCoffee, nodePath, port;
        nodePath = _this.atom.config.get('atom-node-debugger.nodePath');
        appArgs = _this.atom.config.get('atom-node-debugger.appArgs');
        port = _this.atom.config.get('atom-node-debugger.debugPort');
        isCoffee = _this.atom.config.get('atom-node-debugger.isCoffeeScript');
        appPath = _this.atom.workspace.getActiveTextEditor().getPath();
        args = ["--debug-brk=" + port, file || appPath, appArgs || ''];
        if (isCoffee) {
          args = ['--nodejs', "--debug-brk=" + port, file || appPath, appArgs || ''];
        }
        _this.process = childprocess.spawn(nodePath, args, {
          detached: true
        });
        _this.process.stdout.on('data', function(d) {
          return logger.info('child_process', d.toString());
        });
        _this.process.stderr.on('data', function(d) {
          return logger.info('child_process', d.toString());
        });
        _this.process.stdout.on('end', function() {
          return logger.info('child_process', 'end out');
        });
        _this.process.stderr.on('end', function() {
          return logger.info('child_process', 'end errror');
        });
        _this.emit('procssCreated', _this.process);
        _this.process.once('error', function(e) {
          logger.info('child_process error', e);
          return _this.emit('processEnd', e);
        });
        _this.process.once('close', function() {
          logger.info('child_process', 'close');
          return _this.emit('processEnd', _this.process);
        });
        _this.process.once('disconnect', function() {
          logger.info('child_process', 'disconnect');
          return _this.emit('processEnd', _this.process);
        });
        return _this.process;
      };
    })(this));
  };

  ProcessManager.prototype.cleanup = function() {
    var self;
    self = this;
    return new Promise((function(_this) {
      return function(resolve, reject) {
        var onProcessEnd;
        if (_this.process == null) {
          return resolve();
        }
        onProcessEnd = R.once(function() {
          logger.info('child_process', 'die');
          _this.emit('processEnd', _this.process);
          _this.process = null;
          return resolve();
        });
        logger.info('child_process', 'start killing process');
        psTree(_this.process.pid, function(err, children) {
          logger.info('child_process_children', children);
          childprocess.spawn('kill', ['-9'].concat(children.map(function(p) {
            return p.PID;
          })));
          if (self.process != null) {
            return self.process.kill();
          }
        });
        _this.process.once('disconnect', onProcessEnd);
        _this.process.once('exit', onProcessEnd);
        return _this.process.once('close', onProcessEnd);
      };
    })(this));
  };

  return ProcessManager;

})(EventEmitter);

Debugger = (function(superClass) {
  extend(Debugger, superClass);

  function Debugger(atom1, processManager) {
    this.atom = atom1 != null ? atom1 : atom;
    this.processManager = processManager;
    this.isConnected = bind(this.isConnected, this);
    this.removeBreakpointMarkers = bind(this.removeBreakpointMarkers, this);
    this.cleanup = bind(this.cleanup, this);
    this.bindEvents = bind(this.bindEvents, this);
    this.start = bind(this.start, this);
    this.addBreakpoint = bind(this.addBreakpoint, this);
    this.tryGetBreakpoint = bind(this.tryGetBreakpoint, this);
    Debugger.__super__.constructor.call(this);
    this.breakpoints = [];
    this.client = null;
    this.onBreakEvent = Event();
    this.onAddBreakpointEvent = Event();
    this.onRemoveBreakpointEvent = Event();
    this.onBreak = this.onBreakEvent.listen;
    this.onAddBreakpoint = this.onAddBreakpointEvent.listen;
    this.onRemoveBreakpoint = this.onRemoveBreakpointEvent.listen;
    this.processManager.on('procssCreated', this.start);
    this.processManager.on('processEnd', this.cleanup);
    this.markers = [];
  }

  Debugger.prototype.stopRetrying = function() {
    if (this.timeout == null) {
      return;
    }
    return clearTimeout(this.timeout);
  };

  Debugger.prototype.listBreakpoints = function() {
    return new Promise((function(_this) {
      return function(resolve, reject) {
        return _this.client.listbreakpoints(function(err, res) {
          if (err) {
            return reject(err);
          }
          return resolve(res.breakpoints);
        });
      };
    })(this));
  };

  Debugger.prototype.step = function(type, count) {
    var self;
    self = this;
    return new Promise((function(_this) {
      return function(resolve, reject) {
        return _this.client.step(type, count, function(err) {
          if (err) {
            return reject(err);
          }
          return resolve();
        });
      };
    })(this));
  };

  Debugger.prototype.reqContinue = function() {
    var self;
    self = this;
    return new Promise((function(_this) {
      return function(resolve, reject) {
        return _this.client.req({
          command: 'continue'
        }, function(err) {
          if (err) {
            return reject(err);
          }
          return resolve();
        });
      };
    })(this));
  };

  Debugger.prototype.getScriptById = function(id) {
    var self;
    self = this;
    return new Promise((function(_this) {
      return function(resolve, reject) {
        return _this.client.req({
          command: 'scripts',
          "arguments": {
            ids: [id],
            includeSource: true
          }
        }, function(err, res) {
          if (err) {
            return reject(err);
          }
          return resolve(res[0]);
        });
      };
    })(this));
  };

  Debugger.prototype.tryGetBreakpoint = function(script, line) {
    var findMatch;
    findMatch = R.find((function(_this) {
      return function(breakpoint) {
        if (breakpoint.scriptId === script || breakpoint.scriptReq === script || (breakpoint.script && breakpoint.script.indexOf(script) !== -1)) {
          return breakpoint.line === (line + 1);
        }
      };
    })(this));
    return findMatch(this.client.breakpoints);
  };

  Debugger.prototype.toggleBreakpoint = function(editor, script, line) {
    return new Promise((function(_this) {
      return function(resolve, reject) {
        var match;
        match = _this.tryGetBreakpoint(script, line);
        if (match) {
          return _this.clearBreakPoint(script, line);
        } else {
          return _this.addBreakpoint(editor, script, line);
        }
      };
    })(this));
  };

  Debugger.prototype.addBreakpoint = function(editor, script, line, condition, silent) {
    return new Promise((function(_this) {
      return function(resolve, reject) {
        var ambiguous, escapedPath, i, id, len, req, scriptId, scriptPathRegex, scripts;
        if (script === void 0) {
          script = _this.client.currentScript;
          line = _this.client.currentSourceLine + 1;
        }
        if (line === void 0 && typeof script === 'number') {
          line = script;
          script = _this.client.currentScript;
        }
        if (script == null) {
          return;
        }
        if (/\(\)$/.test(script)) {
          req = {
            type: 'function',
            target: script.replace(/\(\)$/, ''),
            confition: condition
          };
        } else {
          if (script !== +script && !_this.client.scripts[script]) {
            scripts = _this.client.scripts;
            for (i = 0, len = scripts.length; i < len; i++) {
              id = scripts[i];
              if (scripts[id] && scripts[id].name && scripts.name.indexOf(script) !== -1) {
                ambiguous = typeof scriptId !== "undefined" && scriptId !== null;
                scriptId = id;
              } else {
                scriptId = script;
              }
            }
          }
        }
        if (line <= 0) {
          return reject(new Error('Line should be a positive value'));
        }
        if (ambiguous) {
          return reject(new Error('Invalid script name'));
        }
        if (scriptId != null) {
          req = {
            type: 'scriptId',
            target: scriptId,
            line: line - 1,
            condition: condition
          };
        } else {
          escapedPath = script.replace(/([\/\\.?*()^${}|[\]])/g, '\\$1');
          scriptPathRegex = "^(.*[\\/\\\\])?" + escapedPath + "$";
          req = {
            type: 'script',
            target: script,
            line: line,
            condition: condition
          };
        }
        return _this.client.setBreakpoint(req, function(err, res) {
          var brk, ref1, ref2;
          if (err) {
            return reject(err);
          }
          if (scriptId == null) {
            scriptId = res.script_id;
            line = res.line + 1;
          }
          brk = {
            id: res.breakpoint,
            scriptId: scriptId,
            script: (((ref1 = _this.client) != null ? (ref2 = ref1.scripts) != null ? ref2[scriptId] : void 0 : void 0) || {}).name,
            line: line,
            condition: condition,
            scriptReq: script
          };
          _this.client.breakpoints.push(brk);
          brk.marker = _this.markLine(editor, brk);
          _this.onAddBreakpointEvent.broadcast(brk);
          return resolve(brk);
        });
      };
    })(this));
  };

  Debugger.prototype.clearBreakPoint = function(script, line) {
    var clearbrk, getbrk, self;
    self = this;
    getbrk = function() {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          var match;
          match = self.tryGetBreakpoint(script, line);
          if (match == null) {
            return reject();
          }
          return resolve({
            breakpoint: match,
            index: self.client.breakpoints.indexOf(match)
          });
        };
      })(this));
    };
    clearbrk = function(brk) {
      return new Promise((function(_this) {
        return function(resolve, reject) {
          return self.client.clearBreakpoint({
            breakpoint: brk.breakpoint.id
          }, function(err) {
            var markerIndex;
            if (err) {
              return reject(err);
            }
            self.client.breakpoints.splice(brk.index, 1);
            markerIndex = self.markers.indexOf(brk.breakpoint.marker);
            self.markers.splice(markerIndex, 1);
            brk.breakpoint.marker.destroy();
            self.onRemoveBreakpointEvent.broadcast(brk);
            return resolve();
          });
        };
      })(this));
    };
    return getbrk().then(clearbrk);
  };

  Debugger.prototype.fullTrace = function() {
    return new Promise((function(_this) {
      return function(resolve, reject) {
        return _this.client.fullTrace(function(err, res) {
          if (err) {
            return reject(err);
          }
          return resolve(res);
        });
      };
    })(this));
  };

  Debugger.prototype.start = function() {
    var attemptConnect, attemptConnectCount, onConnectionError, self;
    logger.info('debugger', 'start connect to process');
    self = this;
    attemptConnectCount = 0;
    attemptConnect = function() {
      logger.info('debugger', 'attempt to connect to child process');
      if (self.client == null) {
        logger.info('debugger', 'client has been cleanup');
        return;
      }
      attemptConnectCount++;
      return self.client.connect(self.atom.config.get('atom-node-debugger.debugPort'), self.atom.config.get('atom-node-debugger.debugHost'));
    };
    onConnectionError = (function(_this) {
      return function() {
        logger.info('debugger', "trying to reconnect " + attemptConnectCount);
        attemptConnectCount++;
        _this.emit('reconnect', attemptConnectCount);
        return _this.timeout = setTimeout(function() {
          return attemptConnect();
        }, 500);
      };
    })(this);
    this.client = new Client();
    this.client.once('ready', this.bindEvents);
    this.client.on('unhandledResponse', (function(_this) {
      return function(res) {
        return _this.emit('unhandledResponse', res);
      };
    })(this));
    this.client.on('break', (function(_this) {
      return function(res) {
        _this.onBreakEvent.broadcast(res.body);
        return _this.emit('break', res.body);
      };
    })(this));
    this.client.on('exception', (function(_this) {
      return function(res) {
        return _this.emit('exception', res.body);
      };
    })(this));
    this.client.on('error', onConnectionError);
    this.client.on('close', function() {
      return logger.info('client', 'client closed');
    });
    return attemptConnect();
  };

  Debugger.prototype.bindEvents = function() {
    logger.info('debugger', 'connected');
    this.emit('connected');
    return this.client.on('close', (function(_this) {
      return function() {
        logger.info('debugger', 'connection closed');
        return _this.processManager.cleanup().then(function() {
          return _this.emit('close');
        });
      };
    })(this));
  };

  Debugger.prototype.lookup = function(ref) {
    return new Promise((function(_this) {
      return function(resolve, reject) {
        return _this.client.reqLookup([ref], function(err, res) {
          if (err) {
            return reject(err);
          }
          return resolve(res[ref]);
        });
      };
    })(this));
  };

  Debugger.prototype["eval"] = function(text) {
    return new Promise((function(_this) {
      return function(resolve, reject) {
        return _this.client.req({
          command: 'evaluate',
          "arguments": {
            expression: text
          }
        }, function(err, result) {
          if (err) {
            return reject(err);
          }
          return resolve(result);
        });
      };
    })(this));
  };

  Debugger.prototype.cleanup = function() {
    if (this.client == null) {
      return;
    }
    this.removeBreakpointMarkers();
    this.removeDecorations();
    this.client.destroy();
    this.client = null;
    return this.emit('disconnected');
  };

  Debugger.prototype.markLine = function(editor, breakPoint) {
    var marker;
    marker = editor.markBufferPosition([breakPoint.line - 1, 0], {
      invalidate: 'never'
    });
    editor.decorateMarker(marker, {
      type: 'line-number',
      "class": 'node-debugger-breakpoint'
    });
    this.markers.push(marker);
    return marker;
  };

  Debugger.prototype.removeBreakpointMarkers = function() {
    var breakpoint, i, len, ref1, results;
    if (this.client == null) {
      return;
    }
    ref1 = this.client.breakpoints;
    results = [];
    for (i = 0, len = ref1.length; i < len; i++) {
      breakpoint = ref1[i];
      results.push(breakpoint.marker.destroy());
    }
    return results;
  };

  Debugger.prototype.removeDecorations = function() {
    var i, len, marker, ref1;
    if (this.markers == null) {
      return;
    }
    ref1 = this.markers;
    for (i = 0, len = ref1.length; i < len; i++) {
      marker = ref1[i];
      marker.destroy();
    }
    return this.markers = [];
  };

  Debugger.prototype.isConnected = function() {
    return this.client != null;
  };

  return Debugger;

})(EventEmitter);

exports.ProcessManager = ProcessManager;

exports.Debugger = Debugger;
