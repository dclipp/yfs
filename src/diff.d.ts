declare interface diffChange {
    count?: number;
    value: string;
    added?: boolean;
    removed?: boolean;
}

declare interface _diff {
    diffLines(oldStr: string, newStr: string, options?: {
        readonly newlineIsToken?: boolean;
    }): diffChange[];
    
    convertChangesToXML(changes: diffChange[]): string;
}

declare module 'diff' {
    const diff: _diff;
    export = diff;
}