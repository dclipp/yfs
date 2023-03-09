const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('createFile', { status: TestDefinition.YfsStatus.IllegalValue }, '/', '//newFile', 'txt');