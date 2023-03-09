import { diffLines, convertChangesToXML } from 'diff';
import { YfsContentPatch } from '../interfaces/yfs-content-patch';
import md5 from 'md5';
import { YfsContentPatchSegment } from '../interfaces/yfs-content-patch-segment';

export class DiffUtil {
    private static escape(s: string): string {
        let t = s.replace(/(\$)/g, '$1$1');
        DiffUtil._XML_ENTITIES.forEach(e => {
            t = t.replace(e.entityCode, e.literal);
        })
        return t;
    }

    private static unescape(s: string, original: string): string {
        const t = s.replace(/\${2}/g, '$');
        const rangeMatch = t.match(/^([0-9]+):([0-9]+)/);
        if (!!rangeMatch) {
            const start = Number.parseInt(rangeMatch[1], 10);
            const length = Number.parseInt(rangeMatch[2], 10);
            return original.substring(start, start + length);
        } else {
            return t;
        }
    }

    private static transformXml(xmlStream: string, original: string): Array<string> {
        const segments = new Array<string>();
        let workingStream = xmlStream;
        let insertMatch = workingStream.match(/^<ins>([^<]+)<\/ins>/);
        let removeMatch = !!insertMatch ? null : workingStream.match(/^<del>([^<]+)<\/del>/);
        let literalMatch = (!!insertMatch || !!removeMatch) ? null : workingStream.match(/^([^<]+)/);
        while (workingStream.length > 0) {
            if (!!insertMatch) {
                segments.push(`+${DiffUtil.escape(insertMatch[1])}$`);
                workingStream = workingStream.substring(insertMatch[0].length);
            } else if (!!removeMatch) {
                segments.push(`-${DiffUtil.escape(removeMatch[1])}$`);
                workingStream = workingStream.substring(removeMatch[0].length);
            } else if (!!literalMatch) {
                const oIndex = original.indexOf(literalMatch[1]);
                segments.push(`@${oIndex}:${literalMatch[1].length}$`);
                workingStream = workingStream.substring(literalMatch[0].length);
            } else {
                throw new Error('No match');
            }

            insertMatch = workingStream.match(/^<ins>([^<]+)<\/ins>/);
            removeMatch = !!insertMatch ? null : workingStream.match(/^<del>([^<]+)<\/del>/);
            literalMatch = (!!insertMatch || !!removeMatch) ? null : workingStream.match(/^([^<]+)/);
        }

        return segments;
    }

    private static parseSegments(s: string, original: string, validateSignature?: boolean): Array<YfsContentPatchSegment> {
        const signature = s.substring(0, s.indexOf('$'));

        if (false && validateSignature === true && DiffUtil.computeSignature(original) !== signature) {
            throw new Error(`Signature does not match`);
        } else {
            const segments = new Array<YfsContentPatchSegment>();
            let i = signature.length + 1;
            let buffer = '';
            let bufferType: 'add' | 'remove' | 'literal' | null = null;
            while (i < s.length) {
                const char = s.charAt(i);
                if (bufferType === null) {
                    if (char === '+') {
                        bufferType = 'add';
                    } else if (char === '-') {
                        bufferType = 'remove';
                    } else if (char === '@') {
                        bufferType = 'literal';
                    } else {
                        throw new Error(`Unknown bufferType: "${char}"`);
                    }

                    i++;
                } else {
                    if (char === '$') {
                        if (s.length > i + 1 && s.charAt(i + 1) === '$') {
                            buffer += '$';
                            i += 2;
                        } else {
                            segments.push({
                                type: bufferType,
                                value: DiffUtil.unescape(buffer, original)
                            });
                            buffer = '';
                            bufferType = null;
                            i++;
                        }
                    } else {
                        buffer += char;
                        i++;
                    }
                }
            }

            return segments;
        }
    }

    private static serialize(xmlStream: string, original: string): string {
        const signature = DiffUtil.computeSignature(original) + '$';
        return DiffUtil.transformXml(xmlStream, original).reduce((x, y) => x + y, signature);
    }

    private static parseSerializedPatch(serializedPatch: string): YfsContentPatch {
        const barIndex0 = serializedPatch.indexOf('|');
        const ccpLength = Number.parseInt(serializedPatch.substring(0, barIndex0), 16);
        
        const segmentStartIndex = barIndex0 + 1 + ccpLength;
        const contextualContainerPath = serializedPatch.substring(barIndex0 + 1, segmentStartIndex);

        const segments = new Array<YfsContentPatchSegment>();
        let i = segmentStartIndex;
        while (i < serializedPatch.length) {
            const serializedTypeChar = serializedPatch.charAt(i);
            const serializedType: 'add' | 'remove' | 'literal' | null = serializedTypeChar === '0'
                ? 'add'
                : serializedTypeChar === '1'
                ? 'remove'
                : serializedTypeChar === '2'
                ? 'literal'
                : null;
                
            if (serializedType === null) {
                throw new Error(`Unknown type code: "${serializedTypeChar}"`);
            } else {
                i++;
                let currentSegmentEndIndex = -1;
                let j = i;
                while (currentSegmentEndIndex === -1 && j < serializedPatch.length) {
                    const char = serializedPatch.charAt(j);
                    if (char === '|') {
                        if (j + 1 < serializedPatch.length && serializedPatch.charAt(j + 1) === '|') {
                            j += 2;
                        } else {
                            currentSegmentEndIndex = j;
                        }
                    } else {
                        j++;
                    }
                }

                if (currentSegmentEndIndex > -1) {
                    const currentSegmentValue = serializedPatch.substring(i, currentSegmentEndIndex);
                    i = currentSegmentEndIndex + 1;
                    segments.push({
                        type: serializedType,
                        value: currentSegmentValue.replace(/\|{2}/g, '|')
                    });
                } else {
                    throw new Error('No ending found for segment value');
                }
            }
        }
        
        return {
            contextualContainerPath: contextualContainerPath,
            segments: segments
        };
    }

    private static computeSignature(content: string): string {
        const c = content
            .replace(/[\u0000-\u001F]/g, '~')
            .replace(/\\n/g, '~');

        return md5(c);
    }

    public static applyPatch(serializedPatch: string, original: string): string {
        const patch = DiffUtil.parseSerializedPatch(serializedPatch);
        const actions = new Array<(s: string, i: number) => [string, number]>();
        patch.segments.forEach(segment => {
            if (segment.type === 'add') {
                const val = segment.value;
                actions.push((s, i) => {
                    const textBefore = s.substring(0, i);
                    const textAfter = s.substring(i);
                    return [textBefore + val + textAfter, i];
                });
            } else if (segment.type === 'remove') {
                const val = segment.value;
                actions.push((s, i) => {
                    const end = i - val.length;
                    if (end < 0) {
                        return [s.substring(val.length), 0];
                    } else {
                        const textBefore = s.substring(0, end);
                        const textAfter = s.substring(i);
                        return [textBefore + textAfter, end];
                    }
                });
            } else if (segment.type !== 'literal') {
                throw new Error('No match');
            }
        });

        let workingContent = original.replace(/\n/g, '\\n');
        let workingIndex = 0;
        actions.forEach(a => {
            const delta = a(workingContent, workingIndex);
            workingContent = delta[0];
            workingIndex = delta[1];
        });

        while (workingContent.includes('\\n')) {
            workingContent = workingContent.replace('\\n', '\n');
        }
        return workingContent;
    }

    public static revertPatch(serializedPatch: string, applied: string): string {
        const patch = DiffUtil.parseSerializedPatch(serializedPatch);
        const actions = new Array<(s: string, i: number) => [string, number]>();
        patch.segments.forEach(segment => {
            if (segment.type === 'add') {
                const val = segment.value;
                actions.push((s, i) => {
                    const end = i - val.length;
                    if (end < 0) {
                        return [s.substring(val.length), 0];
                    } else {
                        const textBefore = s.substring(0, end);
                        const textAfter = s.substring(i);
                        return [textBefore + textAfter, end];
                    }
                });
            } else if (segment.type === 'remove') {
                const val = segment.value;
                actions.push((s, i) => {
                    const textBefore = s.substring(0, i);
                    const textAfter = s.substring(i);
                    return [textBefore + val + textAfter, i];
                });
            } else if (segment.type !== 'literal') {
                throw new Error('No match');
            }
        });

        let workingContent = applied.replace(/\n/g, '\\n');
        let workingIndex = 0;
        actions.reverse().forEach(a => {
            const delta = a(workingContent, workingIndex);
            workingContent = delta[0];
            workingIndex = delta[1];
        });

        while (workingContent.includes('\\n')) {
            workingContent = workingContent.replace('\\n', '\n');
        }
        return workingContent;
    }

    public static createSerializedPatch(contextualContainerPath: string, contentBefore: string, contentAfter: string): string {
        const nlEscapedBefore = contentBefore.replace(/\n/g, '\\n');
        const nlEscapedAfter = contentAfter.replace(/\n/g, '\\n');
        const xml = convertChangesToXML(diffLines(nlEscapedBefore, nlEscapedAfter));
        const segments = DiffUtil.parseSegments(DiffUtil.serialize(xml, nlEscapedBefore), nlEscapedAfter, true);

        const serializedSegments = segments.map(s => {
            const serializedType = s.type === 'add'
                ? '0'
                : s.type === 'remove'
                ? '1'
                : '2';
            const serializedValue = s.value.replace(/\|/g, '||') + '|';
            return `${serializedType}${serializedValue}`;
        }).reduce((x, y) => x + y, '');

        const ccpLength = contextualContainerPath.length.toString(16).padStart(8, '0');
        const serializedPath = `${ccpLength}|${contextualContainerPath}`;

        return `${serializedPath}${serializedSegments}`;

    }

    public static parseContextualContainerPath(serializedPatch: string): string {
        return DiffUtil.parseSerializedPatch(serializedPatch).contextualContainerPath;
    }

    private static readonly _XML_ENTITIES = [
        {
            entityCode: /&lt;/g,
            literal: '<'
        },
        {
            entityCode: /&gt;/g,
            literal: '>'
        },
        {
            entityCode: /&amp;/,
            literal: '&'
        }
    ]
}