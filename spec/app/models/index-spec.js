"use 6to5";

const Rx = require('rx');
const model = require('app/models');

describe('Main model', function() {
  it('should have initial model', function() {
    var action = {
      heightOffsetChanged$: new Rx.Subject(),
      changeHeightStarted$: new Rx.Subject()
    };

    var m = model();

    m.observe(action);

    m.model$.subscribe(
      (data) => {
        expect(data.height).toBe(100);
        expect(data.isShow).toBeTruthy();
        expect(data.offset).toBe(0);
      },
      () => {},
      (err) => { throw err; }
    );
  });

  it('should change the height when height offset changed', function() {
    var action = {
      heightOffsetChanged$: new Rx.Subject(),
      changeHeightStarted$: new Rx.Subject()
    };
    var result;
    var m = model();

    m.observe(action);

    m.model$.subscribe(
      (data) => {
        result = data;
      },
      () => {
        expect(result.height).toBe(130);
        expect(result.offset).toBe(30);
      },
      (err) => { throw err; }
    );

    action.heightOffsetChanged$.onNext(30);

    action.heightOffsetChanged$.onCompleted();
    action.changeHeightStarted$.onCompleted();
  });

  it('should reset the offset when height change started', function() {
    var action = {
      heightOffsetChanged$: new Rx.Subject(),
      changeHeightStarted$: new Rx.Subject()
    };
    var result;
    var m = model();

    m.observe(action);

    m.model$.subscribe(
      (data) => {
        result = data;
      },
      () => {
        expect(result.offset).toBe(0);
      },
      (err) => { throw err; }
    );

    action.heightOffsetChanged$.onNext(30);
    action.changeHeightStarted$.onNext(true);

    action.heightOffsetChanged$.onCompleted();
    action.changeHeightStarted$.onCompleted();

  });
});
