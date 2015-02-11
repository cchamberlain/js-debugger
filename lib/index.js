"use 6to5";

const app = require('app');

module.exports = {
  activate() {
    atom.workspace.addBottomPanel({
      item: app.render(),
      visible: true
    });
  },

  deactivate() {
    console.log('deactive');
  },

  toggle() {
    console.log('toggle');
  }
};
