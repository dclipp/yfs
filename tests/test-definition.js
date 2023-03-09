const yfs = require('../dist/index');

function TestResult(testName, passed, reason) {
    return {
        passed: passed === true,
        reason: !!reason
            ? `${testName} | ${reason}`
            : undefined
    }
}

function stringifyStatus(status) {
    if (status === undefined) {
        return '(undefined)';
    } else if (status === yfs.YfsStatus.OK) {
        return 'OK (0)';
    } else if (status === yfs.YfsStatus.AssetNotFound) {
        return 'AssetNotFound (1)';
    } else if (status === yfs.YfsStatus.AssetAlreadyExists) {
        return 'AssetAlreadyExists (2)';
    } else if (status === yfs.YfsStatus.IllegalValue) {
        return 'IllegalValue (3)';
    } else if (status === yfs.YfsStatus.SystemAssetPermissionDenied) {
        return 'SystemAssetPermissionDenied (4)';
    } else if (status === yfs.YfsStatus.IOError) {
        return 'IOError (5)';
    } else if (status === yfs.YfsStatus.AssetTypeMismatch) {
        return 'AssetTypeMismatch (6)';
    } else if (status === yfs.YfsStatus.AssetNotLoaded) {
        return 'AssetNotLoaded (7)';
    } else if (status === yfs.YfsStatus.UnexpectedError) {
        return 'UnexpectedError (8)';
    } else {
        const s = typeof status === 'object'
            ? JSON.stringify(status)
            : status;
        throw new Error(`unknown status: '${s}'`);
    }
}

exports.YfsStatus = yfs.YfsStatus;

// JSDoc type exports

/** @type {import('../dist').YfsContext} */
const typeYfsContext = {};
exports.typeYfsContext = typeYfsContext;

// end of JSDoc type exports

// exports.default = 
class TestDefinition {
    /**
     * @param {string} actionName
     * @param {{status: yfs.YfsStatus, output: {status: yfs.YfsStatus, payload: any} | undefined, exception: boolean | undefined}} expect
     * @param {any[]} actionParams
     * @param {((ctx: typeof typeYfsContext) => any)[]} preparers
     * @param {({expectedOutcomeType: 'bool',expectedOutcome: boolean,verifier: (ctx: typeof typeYfsContext) => Promise<boolean> } | {expectedOutcomeType: 'void',verifier: (ctx: typeof typeYfsContext) => Promise<void> } | {expectedOutcomeType: 'exception',verifier: (ctx: typeof typeYfsContext) => Promise<any> })[]} verifiers
    */
    // constructor(actionName, expect, ...actionParams) {
    constructor(actionName, expect, actionParams, preparers, verifiers) {
        this._TestDefinition = 'TestDefinition';
        this._actionName = actionName;
        this._actionParams = actionParams || [];
        this._expect = expect;
        this._testName = '';

        /** @type {((ctx: typeof typeYfsContext) => any)[]} */
        this._preparers = preparers || [];

        /** @type {({expectedOutcomeType: 'bool',expectedOutcome: boolean,verifier: (ctx: typeof typeYfsContext) => Promise<boolean> } | {expectedOutcomeType: 'void',verifier: (ctx: typeof typeYfsContext) => Promise<void> } | {expectedOutcomeType: 'exception',verifier: (ctx: typeof typeYfsContext) => Promise<any> })[]} */
        this._postActionVerifiers = verifiers || [];

        this.TestResult = (passed, reason) => TestResult(this._testName, passed, reason);
        this._beforeTest = (...preparers) => {
            this._preparers = preparers;
        }
    }

    /** @param {(ctx: typeof typeYfsContext) => any} preparer */
    withPreparer(preparer) {
        return new TestDefinition(this._actionName, this._expect, this._actionParams, this._preparers.concat(preparer));
    }

    /** @param {{expectedOutcomeType: 'bool',expectedOutcome: boolean,verifier: (ctx: typeof typeYfsContext) => Promise<boolean> } | {expectedOutcomeType: 'void',verifier: (ctx: typeof typeYfsContext) => Promise<void> } | {expectedOutcomeType: 'exception',verifier: (ctx: typeof typeYfsContext) => Promise<any> }} verifier */
    withVerifier(verifier) {
        return new TestDefinition(this._actionName, this._expect, this._actionParams, this._preparers, this._postActionVerifiers.concat(verifier));
    }

    /**
     * @param {typeof typeYfsContext} context
     * @param {string} testName
    */
    async test(context, testName) {
        this._testName = testName;
        let actualStatus = undefined;

        try {
            if (!!this._preparers && this._preparers.length > 0) {
                for (let i = 0; i < this._preparers.length; i++) {
                    await this._preparers[i](context);
                }
            }
        } catch (ex) {
            throw new Error('Failed to prepare test: ' + ex.message);
        }

        try {
            const action = context[this._actionName].bind(context);
            if (this._actionParams.length === 0) {
                actualStatus = await action();
            } else if (this._actionParams.length === 1) {
                actualStatus = await action(this._actionParams[0]);
            } else if (this._actionParams.length === 2) {
                actualStatus = await action(this._actionParams[0], this._actionParams[1]);
            } else if (this._actionParams.length === 3) {
                actualStatus = await action(this._actionParams[0], this._actionParams[1], this._actionParams[2]);
            } else {
                throw new Error(`${testName} | Unsupported param count`);
            }
        } catch (ex) {
            actualStatus = 'exception';
            console.log(`exception: ${ex.message}`)
            throw ex;
        } finally {
            let workingTestResult = this.TestResult(false);
            
            if (this._expect.exception === true) {
                if (actualStatus === 'exception') {
                    workingTestResult = this.TestResult(true);
                } else {
                    workingTestResult = this.TestResult(false, `expected exception but received '${actualStatus}'`);
                }
            } else if (!!this._expect.output) {
                const actualStatusValue = typeof actualStatus === 'object'
                    ? actualStatus.status
                    : actualStatus;
                const actualStatusPayload = typeof actualStatus === 'object'
                    ? actualStatus.payload
                    : undefined;

                if (this._expect.output.status === actualStatusValue) {
                    let expectedPayloadType = '';
                    if (this._expect.output.payload === undefined || this._expect.output.payload === null) {
                        expectedPayloadType = 'null or undefined';
                    } else {
                        expectedPayloadType = typeof this._expect.output.payload;
                    }

                    let actualPayloadType = '';
                    if (actualStatusPayload === undefined || actualStatusPayload === null) {
                        actualPayloadType = 'null or undefined';
                    } else {
                        actualPayloadType = typeof actualStatusPayload;
                    }

                    if (expectedPayloadType === actualPayloadType) {
                        let arePayloadsEqual = false;
                        if (expectedPayloadType === 'object') {
                            if (this._expect.output.payload.$partial === true) {
                                arePayloadsEqual = Object.keys(this._expect.output.payload)
                                    .filter(k => k !== '$partial')
                                    .every(k => this._expect.output.payload[k] === actualStatusPayload[k]);
                            } else {

                            
                            // if (Array.isArray(this._expect.output.payload)) {

                            // } else {
                            //     arePayloadsEqual = JSON.stringify(this._expect.output.payload) === JSON.stringify(actualStatusPayload);
                            // }
                            arePayloadsEqual = JSON.stringify(this._expect.output.payload) === JSON.stringify(actualStatusPayload);
                            }
                        } else {
                            arePayloadsEqual = this._expect.output.payload === actualStatusPayload;
                        }

                        if (arePayloadsEqual) {
                            workingTestResult = this.TestResult(true);
                        } else {
                            workingTestResult = this.TestResult(false, `expected output payload with value '${JSON.stringify(this._expect.output.payload)}' but received '${JSON.stringify(actualStatusPayload)}'`);
                        }
                    } else {
                        workingTestResult = this.TestResult(false, `expected output payload of type '${expectedPayloadType}' but received '${actualPayloadType}'`);
                    }
                } else {
                    workingTestResult = this.TestResult(false, `expected output with status '${stringifyStatus(this._expect.output.status)}' but received '${stringifyStatus(actualStatus)}'`);
                }
            } else {
                if (actualStatus === this._expect.status) {
                    workingTestResult = this.TestResult(true);
                } else {
                    workingTestResult = this.TestResult(false, `expected status '${stringifyStatus(this._expect.status)}' but received '${stringifyStatus(actualStatus)}'`);
                }
            }

            if (workingTestResult.passed) {
                const verifierResults = [];
                if (!!this._postActionVerifiers && this._postActionVerifiers.length > 0) {
                    for (let i = 0; i < this._postActionVerifiers.length; i++) {
                        let verifierOutput = undefined;
                        let verifierThrewException = false;

                        try {
                            verifierOutput = await this._postActionVerifiers[i].verifier(context);
                        } catch (e) {
                            verifierOutput = e;
                            verifierThrewException = true;
                        }

                        let failureReason = '';
                        if (this._postActionVerifiers[i].expectedOutcomeType === 'exception' && !verifierThrewException) {
                            failureReason = 'expected an exception, but none was thrown';
                        } else if (this._postActionVerifiers[i].expectedOutcomeType === 'bool' && verifierOutput !== this._postActionVerifiers[i].expectedOutcome) {
                            failureReason = `expected bool ${this._postActionVerifiers[i].expectedOutcome}, but received ${verifierOutput}`;
                        }
                        
                        verifierResults.push({
                            output: verifierOutput,
                            threwException: verifierThrewException,
                            verifierIndex: i,
                            failureReason: failureReason,
                            passed: failureReason === ''
                        });
                    }
                }

                const failedVerifierResult = verifierResults.find(vr => !vr.passed);
                if (!!failedVerifierResult) {
                    workingTestResult = this.TestResult(false, `verifier ${failedVerifierResult.verifierIndex}: ${failedVerifierResult.failureReason}`);
                }
            }

            return workingTestResult;
        }
    }

    /**
     * @param {string} actionName
     * @param {{status: yfs.YfsStatus, output: {status: yfs.YfsStatus, payload: any} | undefined, exception: boolean | undefined}} expect
     * @param {any[]} actionParams
     * @param {((ctx: typeof typeYfsContext) => any)[]} preparers
     * @param {({expectedOutcomeType: 'bool',expectedOutcome: boolean,verifier: (ctx: typeof typeYfsContext) => Promise<boolean> } | {expectedOutcomeType: 'void',verifier: (ctx: typeof typeYfsContext) => Promise<void> } | {expectedOutcomeType: 'exception',verifier: (ctx: typeof typeYfsContext) => Promise<any> })[]} verifiers
    */
    static defineTest(actionName, expect, ...actionParams) {
        return new TestDefinition(actionName, expect, actionParams, [], []);
    }
}

exports.defineTest = TestDefinition.defineTest;