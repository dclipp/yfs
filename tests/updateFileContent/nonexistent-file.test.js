const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('updateFileContent', { status: TestDefinition.YfsStatus.AssetNotFound }, '/newFile1.txt', 'goodbye');