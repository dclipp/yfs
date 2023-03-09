const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('deleteAsset', { status: TestDefinition.YfsStatus.AssetNotFound }, '/newFile1.txt');