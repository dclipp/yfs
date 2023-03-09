# yfs

yfs is a simple browser-compatible transactional virtual filesystem with delta-diff capabilities (similar to **git**).

It supports files, directories, and symlinks.

&nbsp;

# Examples

## Creating and reading a file 

This example creates a directory named `foo` containing a file named `b.ar`.

It then reads the contents of the file using the absolute path `/foo/b.ar`


```javascript
const yfs = require('yfs');

async function demo() {
    // initialize yfs
    const ctx = yfs.load();

    // create directory foo
    await ctx.createDirectory('/', 'foo');
    // create file b.ar
    await ctx.createFile('/foo', 'b', 'ar', 'Hello, world!');

    // read the file
    const f = await ctx.readFile('/foo/b.ar');
    console.log(`content=${f.payload.content}`);
}

demo().finally(() => {});
```

## Transactional independence 

This example demonstrates the use of transactions to manage filesystem assets.


```javascript
const yfs = require('yfs');

async function demo() {
    // initialize yfs
    const ctx = yfs.load();

    // create directory foo
    await ctx.createDirectory('/', 'foo');
    // create file b.ar
    await ctx.createFile('/foo', 'b', 'ar', 'Hello, world!');

    const tx = await ctx.createTransaction();
    await tx.updateFileContent('/foo/b.ar', 'Farewell!');

    // read the file
    const f1 = await ctx.readFile('/foo/b.ar');
    console.log(f1.payload.content); // still 'Hello, world!' because the update hasn't been committed

    // commit transaction
    await tx.commit();

    // read the file again
    const f2 = await ctx.readFile('/foo/b.ar');
    console.log(f2.payload.content); // 'Farewell!'
}

demo().finally(() => {});
```

&nbsp;

# API

- `createDirectory(containerPath: string, name: string, isLoaded?: boolean): Promise<YfsStatus>;`
- `createSymlink(containerPathInput: string, name: string, targetPathInput: string): Promise<YfsStatus>;`
- `createFile(containerPathInput: string, title: string, extension: string, content?: string): Promise<YfsStatus>;`
- `getAsset(pathInput: string): Promise<YfsOutput<YfsAsset>>;`
- `moveAsset(oldPathInput: string, newContainerPathInput: string): Promise<YfsStatus>;`
- `renameAsset(pathInput: string, newName: string): Promise<YfsStatus>;`
- `deleteAsset(pathInput: string): Promise<YfsStatus>;`
- `purgeAsset(deletedPath: string): Promise<YfsStatus>;`
- `restoreDeletedAsset(pathAtDeletion: string): Promise<YfsStatus>;`
- `getAssetFromHistory(path: string, versionTimestamp: number, versionMatch?: 'exact' | 'less-than' | 'greater-than' | 'less-than-or-eq' | 'greater-than-or-eq'): Promise<YfsOutput<YfsAsset>>;`
- `updateFileContent(pathInput: string, updatedContent: string): Promise<YfsStatus>;`
- `readDirectory(pathInput: string, recursive?: boolean): Promise<YfsOutput<YfsAsset[]>>;`
- `readFile(pathInput: string): Promise<YfsOutput<YfsFile>>;`
- `findFiles(title: string, extension: string, containerPathInput?: string): Promise<YfsOutput<Array<YfsFile>>>;`
- `openDirectory(pathInput: string): Promise<YfsOutput<IYfs>>;`
- `loadRemoteDirectory(pathInput: string, force?: boolean): Promise<YfsStatus>;`
- `assetExists(pathInput: string): Promise<YfsOutput<boolean>>;`
- `getDeltas(): Promise<Array<YfsDelta>>;`
- `getAssetHistory(pathQuery: string, includeDeletes?: boolean): Promise<Array<YfsDelta>>;`
- `discardDeltas(containerPathStartsWith: string, afterTimestamp: number): Promise<number>;`
- `watchAsset(pathInput: string, subscriber: (delta: YfsDelta) => void): { unsubscribe(): void; };`
- `serializeAssets(): Promise<string>;`
- `asInputDataset(): Promise<{ readonly absolutePath: string; readonly assets: Array<YfsAssetInput>; }>;`
- `importAssets(...assets: Array<YfsAssetInput>): Promise<YfsStatus>;`
- `createTransaction(): Promise<YfsTransaction>;`
- `commit(): Promise<void>;`
- `cancel(): void;`
- `isDisposed(): boolean;`

&nbsp;

# To-Dos/Wishlist

- [todo] many things...
- [wish] Support for the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) in browsers
