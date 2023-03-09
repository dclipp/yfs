const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('deleteAsset', { status: TestDefinition.YfsStatus.OK }, '/NEWFILE1.TXT')
	.withPreparer((ctx) => ctx.createFile('/', 'newFile1', 'txt'))