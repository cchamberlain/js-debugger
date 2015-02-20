"use 6to5";

const view = require('app/views');
const Rx = require('rx');

describe('when app rendered', function() {
  it('initialize with the model properties', function() {
    let v = view();
    let model = {
      model$: new Rx.Subject()
    };
    var result;

    v.observe(model);

    v.tree$.subscribe(
      tree => {
        result = tree;
      },
      () => {
        expect(result.properties.style.height).toBe('100px');
        expect(result.properties.style.display).toBe('block');
      },
      err => console.error(err.stack)
    );

    model.model$.onNext({
      height: 100,
      isShow: true,
      offset: 0
    });

    model.model$.onCompleted();
  });
});
