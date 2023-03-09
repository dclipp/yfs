const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('createDirectory', { status: TestDefinition.YfsStatus.OK }, '/', 'newFolder1');