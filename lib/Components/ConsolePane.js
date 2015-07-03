var Event, TextEditorView, h, hg, merge, ref, split, stream;

TextEditorView = require('atom-space-pen-views').TextEditorView;

Event = require('geval/event');

ref = require('event-stream'), merge = ref.merge, split = ref.split;

stream = require('stream');

hg = require('mercury');

h = hg.h;

exports.create = function(_debugger) {
  var ConsoleInput, ConsolePane, input, jsGrammar, tokenizeLine;
  jsGrammar = atom.grammars.grammarForScopeName('source.js');
  tokenizeLine = function(text) {
    var tokens;
    tokens = jsGrammar.tokenizeLine(text).tokens;
    return h('div.line', {}, [
      h('span.test.shell-session', {}, tokens.map(function(token) {
        return h('span', {
          className: token.scopes.join(' ').split('.').join(' ')
        }, [token.value]);
      }))
    ]);
  };
  ConsoleInput = (function() {
    function ConsoleInput(_debugger1) {
      this["debugger"] = _debugger1;
      this.type = "Widget";
      this._changer = Event();
      this.onEvalOrResult = this._changer.listen;
    }

    ConsoleInput.prototype.init = function() {
      var self;
      self = this;
      this.editorView = new TextEditorView({
        mini: true
      });
      this.editor = this.editorView.getModel();
      this.editorView.on('keyup', function(ev) {
        var keyCode, text;
        keyCode = ev.keyCode;
        if (keyCode === 13) {
          text = self.editor.getText();
          self._changer.broadcast(text);
          self.editor.setText('');
          return self["debugger"]["eval"](text).then(function(result) {
            return self._changer.broadcast(result.text);
          })["catch"](function(e) {
            return self._changer.broadcast(e.message);
          });
        }
      });
      return this.editorView.get(0);
    };

    ConsoleInput.prototype.update = function(prev, el) {
      return el;
    };

    return ConsoleInput;

  })();
  input = new ConsoleInput(_debugger);
  ConsolePane = function() {
    var newWriter, state;
    state = hg.state({
      lines: hg.array([])
    });
    input.onEvalOrResult(function(text) {
      return state.lines.push(text);
    });
    newWriter = function() {
      return new stream.Writable({
        write: function(chunk, encoding, next) {
          state.lines.push(chunk.toString());
          return next();
        }
      });
    };
    _debugger.processManager.on('procssCreated', function() {
      var ref1, stderr, stdout;
      ref1 = _debugger.processManager.process, stdout = ref1.stdout, stderr = ref1.stderr;
      stdout.on('data', function(d) {
        return console.log(d.toString());
      });
      stderr.on('data', function(d) {
        return console.log(d.toString());
      });
      stdout.pipe(split()).pipe(newWriter());
      return stderr.pipe(split()).pipe(newWriter());
    });
    return state;
  };
  ConsolePane.render = function(state) {
    return h('div.inset-panel', {
      style: {
        flex: '1 1 0',
        display: 'flex',
        flexDirection: 'column'
      }
    }, [
      h('div.debugger-panel-heading', {}, ['stdout/stderr']), h('div.panel-body.padded', {
        style: {
          flex: 'auto'
        }
      }, state.lines.map(tokenizeLine)), h('div.debugger-editor', {
        style: {
          height: '33px',
          flexBasis: '33px'
        }
      }, [input])
    ]);
  };
  return ConsolePane;
};

exports.cleanup = function() {};
