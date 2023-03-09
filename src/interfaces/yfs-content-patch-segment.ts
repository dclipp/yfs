export interface YfsContentPatchSegment {
    readonly type: 'add' | 'remove' | 'literal';
    readonly value: string;
}