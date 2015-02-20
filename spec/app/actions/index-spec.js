"use 6to5";

const Rx = require('rx');
const action = require('app/actions');
const trigger = require('../../trigger');

describe('main action', function f() {
  it('changing the height and emitting new offset to model', function() {
    var a = action();
    var view = {
      dragStart$: new Rx.Subject()
    };
    var result;

    a.observe(view);
    a.heightOffsetChanged$.subscribe(
      (data) => {
        expect(data).toBe(-30);
      },
      () => {
      },
      (err) => {
        throw err;
      }
    );

    view.dragStart$.onNext({
      screenY: 100
    });

    trigger.mousemove(130, window.document);
    trigger.mouseup(window.document);
  });
});
