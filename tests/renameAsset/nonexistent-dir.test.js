const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('renameAsset', { status: TestDefinition.YfsStatus.AssetNotFound }, '/newFolder', 'folder2');