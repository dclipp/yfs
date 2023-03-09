const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('updateFileContent', { status: TestDefinition.YfsStatus.OK }, '/NEWFILE1.TXT', 'goodbye')
    .withPreparer((ctx) => ctx.createFile('/', 'newFile1', 'txt'))