const _loadYfs = require('../dist/index').load;
const fs = require('fs');
const path = require('path');
const process = require('process');

const ARG_ONLY = '--only';
const ARG_ERR_STACKTRACES = '--err-stacktraces';

const colorText = {
    red: (t) => {
        return `\u001b[31m${t}\u001b[0m`;
    },
    green: (t) => {
        return `\u001b[32m${t}\u001b[0m`;
    }
}

function readTestDir(dirPath, dirName) {
    const tests = [];
    fs.readdirSync(dirPath, {
        withFileTypes: true
    }).forEach(f => {
        const suffixIndex = f.name.toLowerCase().indexOf('.test.js');
        if (f.isFile() && suffixIndex > -1 && suffixIndex + '.test.js'.length === f.name.length) {
            // console.log(`req=./${dirName}/${f.name.substring(0, suffixIndex + 5)}`)
            tests.push({
                testName: `${dirName}.${f.name.substring(0, suffixIndex)}`,
                testModule: require(`./${dirName}/${f.name.substring(0, suffixIndex + 5)}`).default
            })
        }
    });

    return tests;
}

function discoverTests() {
    const testGroups = [];

    fs.readdirSync(__dirname, {
        withFileTypes: true
    }).forEach(f => {
        if (f.isDirectory()) {
            const tests = readTestDir(path.join(__dirname, f.name), f.name);
            if (tests.length > 0) {
                testGroups.push({
                    groupName: f.name,
                    tests: tests
                });
            }
        }
    });

    const onlyArgIndex = process.argv.findIndex(a => a === ARG_ONLY);
    if (onlyArgIndex > -1) {
        const includedTests = process.argv.slice(onlyArgIndex + 1).filter(a => a !== ARG_ERR_STACKTRACES);
        if (includedTests.length > 0) {
            const allTestNames = testGroups.map(tg => {
                return tg.tests.map(t => t.testName);
            }).reduce((x, y) => x.concat(y), []);

            const includedTestNames = [];
            const missingTestNames = [];
            includedTests.forEach(t => {
                if (allTestNames.includes(t)) {
                    includedTestNames.push(t);
                } else {
                    missingTestNames.push(t);
                }
            });

            if (missingTestNames.length > 0) {
                missingTestNames.forEach(mtn => console.error(colorText.red(`test runner error: test not found: '${mtn}'`)));
                process.exit(1);
            } else {
                const removeGroupIndices = [];
                testGroups.forEach((g, gi) => {
                    if (includedTestNames.some(tn => tn.split('.')[0] === g.groupName)) {
                        testGroups[gi].tests = testGroups[gi].tests.filter(t => includedTestNames.includes(t.testName));
                    } else if (!removeGroupIndices.includes(gi)) {
                        removeGroupIndices.push(gi);
                    }
                });

                removeGroupIndices.sort((a, b) => b - a).forEach(i => testGroups.splice(i, 1));
            }
        } else {
            console.error(colorText.red('test runner error: \'only\' flag was specified but no test names were provided'));
            process.exit(1);
        }
    }

    return testGroups;
}

async function run() {
    const testGroups = discoverTests();
    const printErrorStacktraces = process.argv.some(a => a === ARG_ERR_STACKTRACES);
    const outcomes = [];
    for (let i = 0; i < testGroups.length; i++) {
        const group = testGroups[i];

        console.log(`beginning tests for group '${group.groupName}'`);

        let currentTestName = '';
        try {
            for (let j = 0; j < group.tests.length; j++) {
                const t = group.tests[j];
                currentTestName = t.testName;
                const def = t.testModule;
                const ctx = _loadYfs();
                const result = await def.test(ctx, t.testName);
                // console.log(JSON.stringify(result, null, 2));   
                outcomes.push({
                    ...result,
                    testName: t.testName
                });
            }
    
            console.log(`finished tests for group '${group.groupName}'`);
            console.log('');
        } catch (ex) {
            console.error(colorText.red(`unexpected exception in group '${group.groupName}'`));
            console.error(colorText.red(ex.message));
            if (printErrorStacktraces) {
                console.error(`\t**Begin Error Stack**\n\t${ex.stack.replace(/\n/g, '\n\t')}\n\t**End Error Stack**`);
            }

            outcomes.push({
                passed: false,
                reason: `unexpected exception: ${ex.message}`,
                testName: currentTestName
            });
        }
    }

    return outcomes;
}

run().then(outcomes => {
    const longestTestName = outcomes
        .map(o => o.testName.length)
        .sort((a, b) => b - a)[0];

    const padPrint = (outcome) => {
        let useTestName = outcome.testName;
        while (useTestName.length < longestTestName) {
            useTestName += ' ';
        }

        let print = `${useTestName} | ${outcome.passed ? 'PASS' : 'FAIL'}`;
        let colorFn = colorText.green;
        if (!outcome.passed) {
            print += ` | ${outcome.reason}`;
            colorFn = colorText.red;
        }

        console.log(colorFn(print));
    }

    outcomes.sort((a, b) => {
        if (a.passed === b.passed) {
            return 0;
        } else if (a.passed) {
            return -1;
        } else {
            return 1;
        }
    }).forEach(o => {
        padPrint(o);
    });

    const passCount = outcomes.filter(o => o.passed).length;
    console.log('');
    console.log(`${passCount} / ${outcomes.length} passed (${((passCount / outcomes.length) * 100).toFixed(2)}%)`);

    if (passCount === outcomes.length) {
        process.exit(0);
    } else {
        process.exit(1);
    }
});
