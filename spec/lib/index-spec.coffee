nodeDebugger = require '../../lib'

describe "when debugger activated", ->
  it "appends a panel to the workspace", ->
    spyOn(atom.workspace, 'addBottomPanel');
    nodeDebugger.activate()
    expect(atom.workspace.addBottomPanel).toHaveBeenCalled();

  
