const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('createFile', { status: TestDefinition.YfsStatus.AssetNotFound }, '/qqq', 'newFile1', 'txt');