export interface YfsGlobalScopeAccessor {
    readonly globalName: string;
    getUniqueObject(key: string): any;
    uniqueObjectIsDefined(key: string): boolean;
    defineUniqueObject(key: string, value: any): void; 
}