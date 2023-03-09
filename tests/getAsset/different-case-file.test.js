const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('getAsset', {
    output: {
        status: TestDefinition.YfsStatus.OK,
        payload: {
            $partial: true,
            content: 'hello'
        }
    }
}, '/newFile1.txt')
    .withPreparer(
        (ctx) => ctx.createFile('/', 'NEWFILE1', 'TxT', 'hello')
    )