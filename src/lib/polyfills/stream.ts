// Stream polyfill for browser compatibility
const streamModule = {
  Readable: class MockReadable {
    constructor() {}
    pipe() { return this; }
    on() { return this; }
    emit() { return this; }
  },
  Writable: class MockWritable {
    constructor() {}
    write() { return true; }
    end() { return this; }
    on() { return this; }
  },
  Transform: class MockTransform {
    constructor() {}
    pipe() { return this; }
    on() { return this; }
  }
};

export default streamModule;
export const { Readable, Writable, Transform } = streamModule;
