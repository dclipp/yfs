const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('getAsset', {
    output: {
        status: TestDefinition.YfsStatus.OK,
        payload: {
            $partial: true,
            isDirectory: false,
            publicName: 'myfile.txt',
            content: 'hello'
        }
    }
}, '/symfolder/myfile.txt')
    .withPreparer(
        (ctx) => ctx.createDirectory('/', 'folder2')
    )
    .withPreparer(
        (ctx) => ctx.createDirectory('/folder2', 'inner')
    )
    .withPreparer(
        (ctx) => ctx.createFile('/folder2/inner', 'myfile', 'txt', 'hello')
    )
    .withPreparer(
        (ctx) => ctx.createSymlink('/', 'symfolder', '/folder2/inner')
    )