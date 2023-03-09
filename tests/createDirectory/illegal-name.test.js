const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('createDirectory', { status: TestDefinition.YfsStatus.IllegalValue }, '/', '//');