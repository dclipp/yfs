const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('renameAsset', { status: TestDefinition.YfsStatus.AssetNotFound }, '/newFile1.txt', 'renamed.txt');