declare interface _md5 {
    (message: string | Array<any> | Uint8Array): string;
}
declare module 'md5' {
    const md5: _md5;
    export = md5;
}