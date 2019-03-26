var TNSPushy = require("nativescript-pushy").TNSPushy;
var pushy = new TNSPushy();

describe("register function", function () {
  it("exists", function () {
    expect(pushy.register).toBeDefined();
  });
});