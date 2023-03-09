import { YfsAsset } from '../interfaces/yfs-asset';
import { YfsOutput } from '../interfaces/yfs-output';
import { YfsStatus } from '../interfaces/yfs-status';
import { YfsDelta } from '../interfaces/yfs-delta';
import { YfsAssetInput } from '../interfaces/yfs-asset-input';
import { YfsFile } from '../interfaces/yfs-file';
import { Yfs } from '../interfaces/yfs';
import { AssetNameParser } from './asset-name-parser';
import { YfsTransaction } from '../interfaces/yfs-transaction';

export class OpenDirectory implements Yfs {
    public createDirectory(containerPath: string, name: string, isLoaded?: boolean): Promise<YfsStatus> {
        return this._root.createDirectory(this.expandPath(containerPath), name, isLoaded);
    }

    public createSymlink(containerPath: string, name: string, targetPath:string): Promise<YfsStatus> {
        return this._root.createSymlink(this.expandPath(containerPath), name, targetPath);
    }

    public createFile(containerPath: string, title: string, extension: string, content?: string): Promise<YfsStatus> {
        return this._root.createFile(this.expandPath(containerPath), title, extension, content);
    }

    public getAsset(path: string): Promise<YfsOutput<YfsAsset>> {
        return this._root.getAsset(this.expandPath(path));
    }

    public moveAsset(oldPath: string, newContainerPath: string): Promise<YfsStatus> {
        return this._root.moveAsset(this.expandPath(oldPath), this.expandPath(newContainerPath));
    }

    public renameAsset(path: string, newName: string): Promise<YfsStatus> {
        return this._root.renameAsset(this.expandPath(path), newName);
    }

    public deleteAsset(path: string): Promise<YfsStatus> {
        return this._root.deleteAsset(this.expandPath(path));
    }

    public getAssetFromHistory(path: string, versionTimestamp: number, versionMatch?: 'exact' | 'less-than' | 'greater-than' | 'less-than-or-eq' | 'greater-than-or-eq'): Promise<YfsOutput<YfsAsset>> {
        return this._root.getAssetFromHistory(path, versionTimestamp, versionMatch);
    }

    public updateFileContent(path: string, updatedContent: string): Promise<YfsStatus> {
        return this._root.updateFileContent(this.expandPath(path), updatedContent);
    }

    public readDirectory(path: string, recursive?: boolean): Promise<YfsOutput<YfsAsset[]>> {
        return this._root.readDirectory(this.expandPath(path), recursive);
    }

    public readFile(path: string): Promise<YfsOutput<YfsFile>> {
        return this._root.readFile(this.expandPath(path));
    }

    public findFiles(title: string, extension: string, containerPath?: string): Promise<YfsOutput<Array<YfsFile>>> {
        const useContainerPath = containerPath === undefined
            ? this.absolutePath
            : this.expandPath(containerPath);

        return this._root.findFiles(title, extension, useContainerPath);
    }

    public openDirectory(path: string): Promise<YfsOutput<Yfs>> {
        return this._root.openDirectory(this.expandPath(path));
    }

    public loadRemoteDirectory(path: string, force?: boolean): Promise<YfsStatus> {
        return this._root.loadRemoteDirectory(this.expandPath(path), force);
    }

    public assetExists(path: string): Promise<YfsOutput<boolean>> {
        return this._root.assetExists(this.expandPath(path));
    }

    public async getDeltas(): Promise<YfsDelta[]> {
        const history = await this._root.getDeltas();
        return history.filter(h => h.newPath.toLowerCase().startsWith(this.absolutePath.toLowerCase())
            || h.oldPath.toLowerCase().startsWith(this.absolutePath.toLowerCase()));
    }

    public async getAssetHistory(pathQuery: string, includeDeletes?: boolean): Promise<Array<YfsDelta>> {
        return this._root.getAssetHistory(pathQuery, includeDeletes);
    }

    public watchAsset(path: string, subscriber: (delta: YfsDelta) => void): { unsubscribe(): void; } {
        return this._root.watchAsset(this.expandPath(path), subscriber);
    }

    public serializeAssets(): Promise<string> {
        return this._root.serializeAssets();
    }

    public asInputDataset(): Promise<{
        readonly absolutePath: string;
        readonly assets: Array<YfsAssetInput>;
    }> {
        return this._root.asInputDataset();
    }

    public createTransaction(): Promise<YfsTransaction> {
        return this._root.createTransaction();
    }

    public readonly absolutePath: string;

    public constructor(absolutePath: string, root: Yfs) {
        this.absolutePath = absolutePath;
        this._root = root;
    }

    private expandPath(path: string): string {
        const subPath = path.length > 0 && path.startsWith('/')
            ? path.substring(1)
            : path;
        return AssetNameParser.joinPath(this.absolutePath, subPath);
    }

    private readonly _root: Yfs;
}