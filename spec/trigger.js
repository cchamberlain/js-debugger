"use 6to5";

exports.mousemove = function f(to, elem) {
  var evt = new MouseEvent('mousemove', {
    view: window,
    bubbles: true,
    cancelable: true,
    screenY: to
  });

  elem.dispatchEvent(evt);
};

exports.mouseup = function f(elem) {
  var evt = new MouseEvent('mouseup', {
    view: window,
    bubbles: true,
    cancelable: true
  });

  elem.dispatchEvent(evt);
};
