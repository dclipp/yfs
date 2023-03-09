const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('deleteAsset', { status: TestDefinition.YfsStatus.OK }, '/newFile1.txt')
    .withPreparer((ctx) => ctx.createFile('/', 'newFile1', 'txt'))
    .withVerifier({
        expectedOutcomeType: 'bool',
        expectedOutcome: false,
        verifier: async (ctx) => {
            const o2 = await ctx.getAsset('/newFile1.txt');
            // return o2.status === TestDefinition.YfsStatus.OK && o2.payload.isDeleted === true;
            const o = await ctx.createFile('/', 'newFile1', 'txt');
            // return o.status === TestDefinition.YfsStatus.OK;
            return o.status === TestDefinition.YfsStatus.OK && o2.payload.isDeleted === false;
        }
    })