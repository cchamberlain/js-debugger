"use 6to5";

const nodeDebugger = require('../../lib');

describe("when debugger activated", function() {
  it("appends a panel to the workspace", function() {
    spyOn(atom.workspace, 'addBottomPanel');
    nodeDebugger.activate();
    expect(atom.workspace.addBottomPanel).toHaveBeenCalled();
  });
});
