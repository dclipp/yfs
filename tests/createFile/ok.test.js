const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('createFile', { status: TestDefinition.YfsStatus.OK }, '/', 'newFile1', 'txt');