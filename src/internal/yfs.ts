import { Yfs as IYfs } from '../interfaces/yfs';
import { YfsAsset } from '../interfaces/yfs-asset';
import { YfsOutput } from '../interfaces/yfs-output';
import { YfsStatus } from '../interfaces/yfs-status';
import { YfsDirectory as IYfsDirectory } from '../interfaces/yfs-directory';
import { YfsFile as IYfsFile } from '../interfaces/yfs-file';
import { YfsSymlink as IYfsSymlink } from '../interfaces/yfs-symlink';
import { YfsDirectory } from './yfs-directory';
import { YfsFile } from './yfs-file';
import { AssetNameParser } from './asset-name-parser';
import md5 from 'md5';
import { YfsDelta } from '../interfaces/yfs-delta';
import { OpenDirectory } from './open-directory';
import { Utils } from './utils';
import { YfsRemoteResolver } from '../interfaces/remote/yfs-remote-resolver';
import { YfsConfig } from '../interfaces/config/yfs-config';
import { RemoteResolver2 } from './remote-resolver2';
import { YfsSymlink } from './yfs-symlink';
import { PathResolver } from './path-resolver';
import { YfsTransaction } from '../interfaces/yfs-transaction';
// import { AssetsArray } from './assets-array';
import AwaitLock from 'await-lock';
import { YfsAssetInput } from '../interfaces/yfs-asset-input';
import { YfsDeltaType } from '../interfaces/yfs-delta-type';
import { DiffUtil } from './diff-util';
import { YfsGlobalScopeAccessor } from '../interfaces/yfs-global-scope-accessor';
import { DebuggableEndpoint } from './debuggable-endpoint';
import { YfsDeltaAssetType } from '../interfaces/yfs-delta-asset-type';

export class Yfs implements IYfs, YfsTransaction {
    public async createDirectory(containerPath: string, name: string, isLoaded?: boolean): Promise<YfsStatus> {
        return this.internalCreateDirectory(containerPath, name, isLoaded);
    }

    public async createSymlink(containerPathInput: string, name: string, targetPathInput: string): Promise<YfsStatus> {
        const containerPath = this._pathResolver.resolve(containerPathInput);
        const targetPath = this._pathResolver.resolve(targetPathInput);

        let status = YfsStatus.UnexpectedError;

        if (AssetNameParser.validateName(name)) {
            const existing = await this.exists(AssetNameParser.joinPath(containerPath, name));

            if (existing !== false) {
                status = YfsStatus.AssetAlreadyExists;
            } else {
                const container = await this.exists(containerPath);
                if (container === 'dir') {
                    const target = await this.getAsset(targetPath);
                    if (target.status === YfsStatus.OK) {
                        if (target.payload.isDirectory) {
                            const newDir = await YfsSymlink.createNew(containerPath, name, (target.payload as IYfsDirectory).isLoaded, (target.payload as IYfsDirectory).isDeleted, targetPath, this.getSymlinkTarget.bind(this));
                            this.pushAsset(newDir);
                            this._pathResolver.addSymbolicPath(AssetNameParser.joinPath(containerPath, name), targetPath);
                            status = YfsStatus.OK;
                        } else {
                            status = YfsStatus.AssetTypeMismatch;
                        }
                    } else {
                        status = target.status;
                    }
                } else {
                    status = YfsStatus.AssetNotFound;
                }
            }
        } else {
            status = YfsStatus.IllegalValue;
        }

        return status;
    }

    public async createFile(containerPathInput: string, title: string, extension: string, content?: string): Promise<YfsStatus> {
        const containerPath = this._pathResolver.resolve(containerPathInput);
        let status = YfsStatus.UnexpectedError;

        const hash = md5('');
        const parsedName = AssetNameParser.parseFullFileName({ title: title, extension: extension }, hash);
        if (AssetNameParser.validateName(parsedName.publicName) && AssetNameParser.validateName(extension)) {
            const existing = await this.exists(AssetNameParser.joinPath(containerPath, parsedName.publicName));

            if (existing !== false) {
                status = YfsStatus.AssetAlreadyExists;
            } else {
                const container = await this.exists(containerPath);
                if (container === 'dir') {
                    const newFile = await YfsFile.createNew(containerPath, title, extension, content || '', false);
                    this.pushAsset(newFile);
                    status = YfsStatus.OK;
                } else {
                    status = YfsStatus.AssetNotFound;
                }
            }
        } else {
            status = YfsStatus.IllegalValue;
        }

        return status;
    }

    public async getAsset(pathInput: string): Promise<YfsOutput<YfsAsset>> {
        const path = this._pathResolver.resolve(pathInput);
        const index = await this.indexOfAsset(path);
        if (index > -1) {
            return {
                status: YfsStatus.OK,
                payload: this._assets[index]
            }
        } else {
            return {
                status: YfsStatus.AssetNotFound,
                payload: null
            }
        }
    }

    public async moveAsset(oldPathInput: string, newContainerPathInput: string): Promise<YfsStatus> {
        const oldPath = this._pathResolver.resolve(oldPathInput);
        const newContainerPath = this._pathResolver.resolve(newContainerPathInput);
        const index = await this.indexOfAsset(oldPath);
        const indexOfNewContainer = await this.indexOfAsset(newContainerPath);
        if (index > -1 && indexOfNewContainer > -1) {
            const existing = await this.exists(AssetNameParser.joinPath(newContainerPath, this._assets[index].publicName));
            if (existing === false) {
                if (this._assets[index].isDirectory) {
                    this._assets[index] = await YfsDirectory.updateExistingContainerPath(this._assets[index] as IYfsDirectory, newContainerPath, this.getContents.bind(this));
                } else {
                    this._assets[index] = await YfsFile.updateExistingContainerPath(this._assets[index] as IYfsFile, newContainerPath);
                }
                this.pushDelta(this._assets[index].delta);
                
                return YfsStatus.OK;
            } else {
                return YfsStatus.AssetAlreadyExists;
            }
        } else {
            return YfsStatus.AssetNotFound;
        }
    }

    public async renameAsset(pathInput: string, newName: string): Promise<YfsStatus> {
        const path = this._pathResolver.resolve(pathInput);
        if (AssetNameParser.validateName(newName)) {
            const index = await this.indexOfAsset(path);
            if (index > -1) {
                const existing = await this.exists(AssetNameParser.joinPath(this._assets[index].containerPath, newName));
                if (existing === false) {
                    if (this._assets[index].isDirectory) {
                        this._assets[index] = await YfsDirectory.renameExisting(this._assets[index] as IYfsDirectory, newName, this.getContents.bind(this));
                    } else {
                        this._assets[index] = await YfsFile.renameExisting(this._assets[index] as IYfsFile, newName);
                    }
                    this.pushDelta(this._assets[index].delta);
                    
                    return YfsStatus.OK;
                } else {
                    return YfsStatus.AssetAlreadyExists;
                }
            } else {
                return YfsStatus.AssetNotFound;
            }
        } else {
            return YfsStatus.IllegalValue;
        }
    }

    public async deleteAsset(pathInput: string): Promise<YfsStatus> {
        const path = this._pathResolver.resolve(pathInput);
        const index = await this.indexOfAsset(path);
        if (index > -1) {
            const deltas = new Array<YfsDelta>();

            if (this._assets[index].isDirectory) {
                this._assets[index] = await YfsDirectory.deleteExisting(this._assets[index] as IYfsDirectory, this.getContents.bind(this));
            } else {
                this._assets[index] = await YfsFile.deleteExisting(this._assets[index] as IYfsFile);
            }
            deltas.push(this._assets[index].delta);
            
            const subDeletions = await this.bubbleDelete(path, []);
            subDeletions.sort((a, b) => b.index - a.index).forEach(sd => {
                const a = this._assets.splice(sd.index, 1)[0];
                deltas.push(a.delta);
            });
                
            this.pushDeltas(deltas);
            return YfsStatus.OK;
        } else {
            return YfsStatus.AssetNotFound;
        }
    }

    public async purgeAsset(deletedPath: string): Promise<YfsStatus> {
        if (this._isTransaction === true) {
            const path = this._pathResolver.resolve(deletedPath);
            const deltaIndex = this._deltas.findIndex((d, di, da) => d.newPath.toLowerCase() === path.toLowerCase() && !da.some((d2, d2i) => d2i !== di && d2.timestamp > d.timestamp && d2.newPath === d.newPath));
            if (deltaIndex > -1) {
                const trackingKey = this._deltas[deltaIndex].trackingKey;
                const assetIndices = new Array<number>();
                const deltaIndices = new Array<number>();

                this._assets.forEach((a, ai) => {
                    if (a.delta.trackingKey === trackingKey) {
                        assetIndices.push(ai);
                    }
                });
                
                this._deltas.forEach((d, di) => {
                    if (d.trackingKey === trackingKey) {
                        deltaIndices.push(di);
                    }
                });

                const subDeletions = await this.bubbleDelete(path, []);
                subDeletions.forEach(sd => {
                    if (!assetIndices.includes(sd.index)) {
                        assetIndices.push(sd.index);
                        this._deltas.forEach((d, di) => {
                            if (!deltaIndices.includes(di) && d.trackingKey === sd.asset.delta.trackingKey) {
                                deltaIndices.push(di);
                            }
                        });
                    }
                });

                assetIndices.sort((a, b) => b - a).forEach(ai => {
                    this._assets.splice(ai, 1);
                });
                deltaIndices.sort((a, b) => b - a).forEach(di => {
                    this._deltas.splice(di, 1);
                });

                return YfsStatus.OK;
            } else {
                return YfsStatus.AssetNotFound;
            }
        } else if (this._isTransaction === 'disposed') {
            throw new Error('Cannot perform operations on a disposed transaction');
        } else {
            throw new Error('Object is not a transaction');
        }
    }

    public async restoreDeletedAsset(pathAtDeletion: string): Promise<YfsStatus> {
        if (this._isTransaction === true) {
            const path = this._pathResolver.resolve(pathAtDeletion);
            const deltaIndex = this._deltas.findIndex(d => d.type === YfsDeltaType.Delete && d.newPath.toLowerCase() === path.toLowerCase());
            if (deltaIndex > -1) {
                const restoreItems = new Array<{
                    readonly newPath: string;
                    readonly timestamp: number;
                }>();

                const deletionDelta = this._deltas[deltaIndex];
                restoreItems.push({
                    newPath: deletionDelta.newPath,
                    timestamp: deletionDelta.timestamp
                });

                this._deltas
                    .filter(d => d.type === YfsDeltaType.Delete && d.timestamp <= deletionDelta.timestamp && d.newPath.length > path.length && d.newPath.toLowerCase().startsWith(path.toLowerCase()))
                    .forEach(d => {
                        const riIndex = restoreItems.findIndex(ri => ri.newPath === d.newPath);
                        if (riIndex < 0) {
                            restoreItems.push({
                                newPath: d.newPath,
                                timestamp: d.timestamp
                            });
                        } else if (restoreItems[riIndex].timestamp < d.timestamp) {
                            restoreItems[riIndex] = {
                                newPath: d.newPath,
                                timestamp: d.timestamp
                            };
                        }
                    });

                const notifyDeltas = new Array<YfsDelta>();
                for (let i = 0; i < restoreItems.length; i++) {
                    const rebuilt = await this.buildAssetFromDeltas(restoreItems[i].newPath, restoreItems[i].timestamp);
                    this._assets.push(rebuilt.asset);
                    this._deltas.splice(deltaIndex);
                    notifyDeltas.push(rebuilt.latestDelta);
                }

                // for all restored assets, remove the deleted version from the assets list
                const restoredDeletedIndices = new Array<number>();
                this._assets.forEach((a, ai, aa) => {
                    if (a.isDeleted && aa.some((a2, a2i) => a2i > ai && !a2.isDeleted && a2.publicName === a.publicName && a2.containerPath === a.containerPath)) {
                        restoredDeletedIndices.push(ai);
                    }
                });

                restoredDeletedIndices.sort((a, b) => b - a).forEach(index => this._assets.splice(index, 1));

                notifyDeltas.forEach(nd => this.notifyWatchers(nd));

                return YfsStatus.OK;
            } else {
                return YfsStatus.AssetNotFound;
            }
        } else if (this._isTransaction === 'disposed') {
            throw new Error('Cannot perform operations on a disposed transaction');
        } else {
            throw new Error('Object is not a transaction');
        }
    }

    public async getAssetFromHistory(path: string, versionTimestamp: number, versionMatch?: 'exact' | 'less-than' | 'greater-than' | 'less-than-or-eq' | 'greater-than-or-eq'): Promise<YfsOutput<YfsAsset>> {
        let status = YfsStatus.UnexpectedError;
        let historicAsset: YfsAsset | null = null;

        const versionMatches = (v1: number) => {
            if (versionMatch === 'less-than') {
                return v1 < versionTimestamp;
            } else if (versionMatch === 'less-than-or-eq') {
                return v1 < versionTimestamp;
            } else if (versionMatch === 'greater-than') {
                return v1 > versionTimestamp;
            } else if (versionMatch === 'greater-than-or-eq') {
                return v1 >= versionTimestamp;
            } else {
                return v1 === versionTimestamp;
            }
        }

        const targetDelta = this._deltas.find(d => d.newPath === path && versionMatches(d.timestamp));
        if (!!targetDelta) {
            const subsequentDeltas = new Array<YfsDelta>();
            let current = this._deltas.find(d => d.oldPath === targetDelta.newPath && d.timestamp > targetDelta.timestamp);
            while (!!current) {
                subsequentDeltas.push(current);
                current = this._deltas.find(d => d.oldPath === current!.newPath && d.timestamp > current!.timestamp);
            }
            
            const sortedDeltas = subsequentDeltas.concat([targetDelta]).sort((a, b) => a.timestamp - b.timestamp);
            const startVersion = this._assets.find(a => AssetNameParser.joinPath(a.containerPath, a.publicName).toLowerCase() === sortedDeltas[sortedDeltas.length - 1].newPath.toLowerCase());
            if (!!startVersion) {
                const workingAsset = {
                    publicName: startVersion.publicName,
                    containerPath: startVersion.containerPath,
                    isDirectory: startVersion.isDirectory,
                    isDeleted: startVersion.isDeleted,
                    isLoaded: startVersion.isDirectory ? (startVersion as IYfsDirectory).isLoaded : true,
                    isSymlink: startVersion.isDirectory && (startVersion as IYfsDirectory).isSymlink,
                    targetPath: startVersion.isDirectory && (startVersion as IYfsDirectory).isSymlink
                        ? (startVersion as IYfsSymlink).targetPath
                        : undefined,
                    content: startVersion.isDirectory ? undefined : (startVersion as IYfsFile).content,
                    title: startVersion.isDirectory ? undefined : (startVersion as IYfsFile).title,
                    extension: startVersion.isDirectory ? undefined : (startVersion as IYfsFile).extension,
                    timestamp: startVersion.delta.timestamp
                };

                while (sortedDeltas.length > 0) {
                    const delta = sortedDeltas.pop()!;
                    if (delta.type === YfsDeltaType.Create) {
                        workingAsset.isDeleted = false;
                    } else if (delta.type === YfsDeltaType.Delete) {
                        workingAsset.isDeleted = true;
                    } else if (delta.type === YfsDeltaType.Modify) {
                        workingAsset.content = DiffUtil.applyPatch(delta.detail || '', workingAsset.content || '');
                    } else if (delta.type === YfsDeltaType.Move) {
                        workingAsset.containerPath = delta.oldPath.substring(0, delta.oldPath.lastIndexOf(workingAsset.publicName) - 1);
                    } else if (delta.type === YfsDeltaType.Rename) {
                        if (workingAsset.isDirectory) {
                            workingAsset.publicName = delta.oldPath.replace(delta.newPath, '');
                        } else {
                            const prevName = delta.oldPath.replace(delta.newPath, '');
                            const lastDotIndex = prevName.lastIndexOf('.');
                            const prevTitle = prevName.substring(0, lastDotIndex > -1 ? lastDotIndex : undefined);
                            const prevExtension = lastDotIndex > -1 ? prevName.substring(lastDotIndex + 1) : '';
                            workingAsset.publicName = AssetNameParser.joinFileNameParts(prevTitle, prevExtension);
                            workingAsset.title = prevTitle;
                            workingAsset.extension = prevExtension;
                        }
                    }
                }
                
                historicAsset = workingAsset.isSymlink
                    ? await YfsSymlink.createNew(workingAsset.containerPath, workingAsset.publicName, workingAsset.isLoaded, workingAsset.isDeleted, workingAsset.targetPath!, this.getSymlinkTarget.bind(this), workingAsset.timestamp)
                    : workingAsset.isDirectory
                    ? await YfsDirectory.createNew(workingAsset.containerPath, workingAsset.publicName, workingAsset.isLoaded, workingAsset.isDeleted, this.getContents.bind(this), workingAsset.timestamp)
                    : await YfsFile.createNew(workingAsset.containerPath, workingAsset.title!, workingAsset.extension!, workingAsset.content || '', workingAsset.isDeleted, workingAsset.timestamp);

                status = YfsStatus.OK;
            } else {
                status = YfsStatus.AssetNotFound;
            }
        } else {
            status = YfsStatus.AssetNotFound;
        }

        if (status === YfsStatus.OK) {
            return {
                status: YfsStatus.OK,
                payload: historicAsset!
            }
        } else {
            return {
                status: status,
                payload: null
            }
        }
    }

    public async updateFileContent(pathInput: string, updatedContent: string): Promise<YfsStatus> {
        const path = this._pathResolver.resolve(pathInput);
        const index = await this.indexOfAsset(path);
        if (index > -1) {
            if (this._assets[index].isDirectory) {
                return YfsStatus.AssetTypeMismatch;
            } else {
                this._assets[index] = await YfsFile.updateExistingContent(this._assets[index] as IYfsFile, updatedContent);
                this.pushDelta(this._assets[index].delta);
                return YfsStatus.OK;
            }
        } else {
            return YfsStatus.AssetNotFound;
        }
    }

    public async readDirectory(pathInput: string, recursive?: boolean): Promise<YfsOutput<YfsAsset[]>> {
        const path = this._pathResolver.resolve(pathInput);
        let status = YfsStatus.OK;
        let contents: Array<YfsAsset> | null = null;

        const target = await this.exists(path);
        if (target === 'dir') {
            contents = new Array<YfsAsset>();
            const directoryIndices = new Array<number>();
            const currentContents = await this.getContents(path);
            for (let i = 0; i < currentContents.length; i++) {
                const current = currentContents[i];
                if (current.isDirectory) {
                    const dup = await YfsDirectory.duplicate(current as IYfsDirectory, this.getContents.bind(this));
                    contents.push(dup);
                    directoryIndices.push(contents.length - 1);
                } else {
                    const dup = await YfsFile.duplicate(current as IYfsFile);
                    contents.push(dup);
                }
            }

            if (recursive === true && directoryIndices.length > 0) {
                for (let i = 0; i < directoryIndices.length && status === YfsStatus.OK; i++) {
                    const di = directoryIndices[i];
                    if (contents[di].containerPath === path) {
                        const sub = await this.readDirectory(AssetNameParser.joinPath(path, contents[di].publicName), true);
                        if (sub.status === YfsStatus.OK) {
                            sub.payload.forEach(p => contents!.push(p));
                        } else {
                            status = sub.status;
                        }
                    }
                }
            }
        } else {
            status = YfsStatus.AssetNotFound;
        }

        if (status === YfsStatus.OK) {
            return {
                status: status,
                payload: contents!.filter((p, pi, pa) => !this.isAssetDeleted(p, pa))
            };
        } else {
            return {
                status: status,
                payload: null
            };
        }
    }

    public async readFile(pathInput: string): Promise<YfsOutput<YfsFile>> {
        const path = this._pathResolver.resolve(pathInput);
        const asset = await this.getAsset(path);
        if (asset.status === YfsStatus.OK) {
            if (asset.payload.isDirectory) {
                return {
                    status: YfsStatus.AssetTypeMismatch,
                    payload: null
                };
            } else {
                const dup = await YfsFile.duplicate(asset.payload as IYfsFile);
                return {
                    status: YfsStatus.OK,
                    payload: dup
                };
            }
        } else {
            return {
                status: asset.status,
                payload: null
            };
        }
    }

    public async findFiles(title: string, extension: string, containerPathInput?: string): Promise<YfsOutput<Array<YfsFile>>> {
        const containerPath = containerPathInput === undefined
            ? undefined
            : this._pathResolver.resolve(containerPathInput);
        if (AssetNameParser.validateName(title)) {
            let directoryExists = true;
            if (containerPath !== undefined) {
                const existing = await this.exists(containerPath);
                directoryExists = existing === 'dir';
            }

            if (directoryExists) {
                const payloads = this._assets
                    .filter(a => {
                        if ((containerPath === undefined || a.containerPath.toLowerCase().startsWith(containerPath.toLowerCase()))
                            && (!a.isDeleted && !a.isDirectory)) {
                            const file = a as IYfsFile;
                            const titleMatch = title === '' || (file.title.toLowerCase() === title.toLowerCase());
                            const extensionMatch = extension === '' || (file.extension.toLowerCase() === extension.toLowerCase());
                            return titleMatch && extensionMatch;
                        } else {
                            return false;
                        }
                    });

                const duplicates = new Array<IYfsFile>();
                for (let i = 0; i < payloads.length; i++) {
                    const a = payloads[i];
                    const dup = await YfsFile.duplicate(a as IYfsFile);
                    duplicates.push(dup);
                }

                return {
                    status: YfsStatus.OK,
                    payload: duplicates
                };
            } else {
                return {
                    status: YfsStatus.AssetNotFound,
                    payload: null
                };
            }
        } else {
            return {
                status: YfsStatus.IllegalValue,
                payload: null
            };
        }
    }

    public async openDirectory(pathInput: string): Promise<YfsOutput<IYfs>> {
        // const existing = await this.exists(path);
        const path = this._pathResolver.resolve(pathInput);
        let failureStatus: YfsStatus | null = null;
        let payload: IYfs | null = null;

        const index = await this.indexOfAsset(path);
        if (index > -1 && this._assets[index].isDirectory) {
            if (!((this._assets[index] as IYfsDirectory).isLoaded)) {
                if (this._disableLazyLoad) {
                    failureStatus = YfsStatus.AssetNotLoaded;
                } else {
                    const status = await this.loadRemoteDirectory(path);
                    if (status !== YfsStatus.OK) {
                        failureStatus = status;
                    }
                }
            }

            payload = new OpenDirectory(path, this);
        } else {
            failureStatus = YfsStatus.AssetNotFound;
        }

        if (failureStatus === null) {
            return {
                status: YfsStatus.OK,
                payload: payload!
            };
        } else {
            return {
                status: failureStatus,
                payload: null
            };
        }
    }

    public async loadRemoteDirectory(pathInput: string, force?: boolean): Promise<YfsStatus> {
        const path = this._pathResolver.resolve(pathInput);
        const asset = await this.getAsset(path);
        if (asset.status === YfsStatus.OK) {
            if (asset.payload.isDirectory) {
                const directory = asset.payload as IYfsDirectory;
                if (directory.isLoaded && force !== true) {
                    return YfsStatus.OK;
                } else {
                    return await this._remoteResolver.loadDirectory(directory.containerPath, directory.publicName);
                }
            } else {
                return YfsStatus.AssetTypeMismatch;
            }
        } else {
            return asset.status;
        }
    }

    public async assetExists(pathInput: string): Promise<YfsOutput<boolean>> {
        const path = this._pathResolver.resolve(pathInput);
        const index = await this.indexOfAsset(path);
        if (index > -1) {
            return {
                status: YfsStatus.OK,
                payload: true
            };
        } else {
            return {
                status: YfsStatus.OK,
                payload: false
            };
        }
    }

    public async getDeltas(): Promise<Array<YfsDelta>> {
        return this._deltas.map(d => JSON.parse(JSON.stringify(d)));
    }

    public async getAssetHistory(pathQuery: string, includeDeletes?: boolean): Promise<Array<YfsDelta>> {
        const history = new Array<YfsDelta>();
        
        this._deltas.filter(d => AssetNameParser.isPathQueryMatch(pathQuery, d.newPath)).forEach(delta => {
            let currentDelta: YfsDelta | undefined = delta;
            if (!!currentDelta && currentDelta.type === YfsDeltaType.Delete && includeDeletes !== true) {
                currentDelta = undefined;
            }

            while (!!currentDelta) {
                history.push(currentDelta);
                currentDelta = this._deltas.find(d => d.newPath === currentDelta!.oldPath);
            }
        })

        return history;
    }

    // public async squashDeltas(toTimestamp: number): Promise<boolean> {TODO
    //     // let discardCount = 0;
    //     // const removeIndices = new Array<number>();
    //     // this._deltas.forEach((d, di) => {
    //     //     if (d.timestamp > afterTimestamp) {
    //     //         removeIndices.push(di);
    //     //     }
    //     // });

    //     // discardCount = removeIndices.length;
    //     // removeIndices.sort((a, b) => b - a).forEach(i => this._deltas.splice(i, 1));

    //     // return discardCount;
    // }

    public async discardDeltas(containerPathStartsWith: string, afterTimestamp: number): Promise<number> {
        if (this._isTransaction === true) {
            let discardCount = 0;
            let removeIndices = new Array<number>();
            this._deltas.forEach((d, di) => {
                if (d.timestamp > afterTimestamp && this.isDeltaContainerPathMatch(containerPathStartsWith, d)) {
                    removeIndices.push(di);
                }
            });

            discardCount = removeIndices.length;
            removeIndices = removeIndices.sort((a, b) => b - a);
            for (let ri = 0; ri < removeIndices.length; ri++) {
                const deltaIndex = removeIndices[ri];
                const discardedDelta = this._deltas.splice(deltaIndex, 1)[0];
                const previousDeltas = this._deltas
                    .filter(d => d.timestamp < discardedDelta.timestamp && (d.oldPath === discardedDelta.newPath || d.newPath === discardedDelta.newPath))
                    .sort((a, b) => b.timestamp - a.timestamp);

                const assetIndex = previousDeltas.length > 0
                    ? this._assets.findIndex(a => a.delta.type === discardedDelta.type
                        && a.delta.oldPath === discardedDelta.oldPath
                        && a.delta.newPath === discardedDelta.newPath
                        && a.delta.detail === discardedDelta.detail)
                    : -1;

                if (previousDeltas.length > 0 && assetIndex > -1) {
                    const asset = this._assets[assetIndex];
                    if (asset.isDirectory) {
                        if ((asset as IYfsDirectory).isSymlink) {
                            this._assets[assetIndex] = await YfsSymlink.duplicate(asset as IYfsSymlink, this.getSymlinkTarget.bind(this), previousDeltas[0]);
                        } else {
                            this._assets[assetIndex] = await YfsDirectory.duplicate(asset as IYfsDirectory, this.getContents.bind(this), previousDeltas[0]);    
                        }
                    } else {
                        const file = asset as IYfsFile;
                        let revertContent: string | undefined;
                        if (!!discardedDelta.detail) {
                            revertContent = DiffUtil.revertPatch(discardedDelta.detail, file.content);
                        }

                        this._assets[assetIndex] = await YfsFile.duplicate(file, {
                            delta: previousDeltas[0],
                            content: revertContent
                        });
                    }
                }
            }

            return discardCount;
        } else if (this._isTransaction === 'disposed') {
            throw new Error('Cannot perform operations on a disposed transaction');
        } else {
            throw new Error('Object is not a transaction');
        }
    }

    public watchAsset(pathInput: string, subscriber: (delta: YfsDelta) => void): { unsubscribe(): void; } {
        const path = this._pathResolver.resolve(pathInput);
        let handle = md5(Utils.createUuid());
        while (Object.keys(this._watchers).includes(handle)) {
            handle = md5(Utils.createUuid());
        }
        
        this._watchers[handle] = {
            path: path,
            subscriber: subscriber
        };

        return {
            unsubscribe: () => {
                delete this._watchers[handle];
            }
        }
    }

    public async serializeAssets(): Promise<string> {
        const serializedPayload: {
            absolutePath: string,
            assets: Array<YfsAssetInput>
        } = {
            absolutePath: this.absolutePath,
            assets: this._assets.map(a => {
                if (a.isDirectory) {
                    if ((a as IYfsDirectory).isSymlink) {
                        const symlink = a as IYfsSymlink;
                        return {
                            name: a.publicName,
                            containerPath: a.containerPath,
                            isDirectory: true,
                            isDeleted: a.isDeleted,
                            delta: a.delta,
                            isLoaded: symlink.isLoaded,
                            isSymlink: true,
                            targetPath: symlink.targetPath
                        }
                    } else {
                        const dir = a as IYfsDirectory;
                        return {
                            name: a.publicName,
                            containerPath: a.containerPath,
                            isDirectory: true,
                            isDeleted: a.isDeleted,
                            delta: a.delta,
                            isLoaded: dir.isLoaded,
                            isSymlink: false
                        }
                    }
                } else {
                    const file = a as IYfsFile;
                    return {
                        containerPath: a.containerPath,
                        isDirectory: false,
                        isDeleted: a.isDeleted,
                        delta: a.delta,
                        title: file.title,
                        extension: file.extension,
                        content: file.content
                    }
                }
            })
        };

        return JSON.stringify(serializedPayload, null, 2);
    }

    public asInputDataset(): Promise<{
        readonly absolutePath: string;
        readonly assets: Array<YfsAssetInput>;
    }> {
        return Promise.resolve({
            absolutePath: this.absolutePath,
            assets: this._assets.map(a => a.asInput())
        });
    }

    public async importAssets(...assets: Array<YfsAssetInput>): Promise<YfsStatus> {
        if (this._isTransaction === true) {
            let status = YfsStatus.OK;
            
            for (let i = 0; i < assets.length && status === YfsStatus.OK; i++) {
                status = await Yfs.internalImportAsset(assets[i], this.getContents.bind(this), this.getSymlinkTarget.bind(this), (asset) => {
                    return this.pushAsset(asset);
                }, (symPath, targetPath) => {
                    this._pathResolver.addSymbolicPath(symPath, targetPath);
                });
            }

            return status;
        } else if (this._isTransaction === 'disposed') {
            throw new Error('Cannot perform operations on a disposed transaction');
        } else {
            throw new Error('Object is not a transaction');
        }
    }

    public async createTransaction(): Promise<YfsTransaction> {
        if (this._isTransaction === false) {
            await this._transactionLock().acquireAsync();
            return new Yfs(undefined, this);
        } else {
            throw new Error('Cannot begin a transaction from within an existing transaction');
        }
    }

    public async commit(): Promise<void> {
        if (this._isTransaction === true) {
            if (this._transactionContext!._assets.length > 0) {
                this._transactionContext!._assets.splice(0, this._transactionContext!._assets.length);
            }

            this._assets.forEach(a => this._transactionContext!._assets.push(a));

            if (this._transactionContext!._deltas.length > 0) {
                this._transactionContext!._deltas.splice(0, this._transactionContext!._deltas.length);
            }

            const notifyDeltas = new Array<YfsDelta>();
            this._deltas.forEach(d => {
                this._transactionContext!._deltas.push(d);
                notifyDeltas.push(d);
            });
            
            if (notifyDeltas.length > 0) {
                notifyDeltas.forEach(nd => this._transactionContext!.notifyWatchers(nd));
            }
            
            this._isTransaction = 'disposed';
            this._transactionLock().release();
        } else if (this._isTransaction === 'disposed') {
            throw new Error('Cannot perform operations on a disposed transaction');
        } else {
            throw new Error('Object is not a transaction');
        }
    }

    public cancel(): void {
        if (this._isTransaction === true) {
            this._isTransaction = 'disposed';
            this._transactionLock().release();
        } else if (this._isTransaction === 'disposed') {
            throw new Error('Cannot perform operations on a disposed transaction');
        } else {
            throw new Error('Object is not a transaction');
        }
    }

    public isDisposed(): boolean {
        return this._isTransaction === 'disposed';
    }

    public readonly absolutePath: string;

    public constructor(createNewParams?: {
        readonly absolutePath: string;
        readonly assets?: Array<YfsAssetInput>;
        readonly config?: YfsConfig;
        readonly globalScopeAccessor?: YfsGlobalScopeAccessor;
    }, createTransactionParams?: Yfs) {
        if (!!createNewParams) {
            // this._assets = AssetsArray(assets);
            this._assets = new Array<YfsAsset>();
            this._deltas = new Array<YfsDelta>();
            this._watchers = {};
            this.absolutePath = createNewParams.absolutePath;
            this._pathResolver = new PathResolver();
            if (!!createNewParams.assets && createNewParams.assets.length > 0) {
                createNewParams.assets.forEach(async input => {
                    await Yfs.internalImportAsset(input, this.getContents.bind(this), this.getSymlinkTarget.bind(this), (asset) => {
                        return this.pushAsset(asset);
                    }, (symPath, targetPath) => {
                        this._pathResolver.addSymbolicPath(symPath, targetPath);
                    });
                });
            }
            this._remoteResolver = RemoteResolver2.create({
                    pushLoadedDirectory: async (containerPath, dirName, childAssets) => {
                        const index = await this.indexOfAsset(AssetNameParser.joinPath(containerPath, dirName));
                        this._assets[index] = await YfsDirectory.markExistingAsLoaded(this._assets[index] as IYfsDirectory, this.getContents.bind(this));
                        childAssets.forEach(a => this.pushAsset(a));
                    },
                    getContents: (containerPath) => {
                        return this.getContents(containerPath);
                    },
                    getDirectory: async (containerPath, dirName) => {
                        const asset = await this.getAsset(AssetNameParser.joinPath(containerPath, dirName));
                        if (asset.status === YfsStatus.OK && asset.payload.isDirectory) {
                            return asset.payload as IYfsDirectory;
                        } else {
                            return null;
                        }
                    }
                }, !!createNewParams.config ? createNewParams.config.remoteOpts : undefined);
            this._disableLazyLoad = !!createNewParams.config && createNewParams.config.disableLazyLoad === true;

            this._isTransaction = false;

            const lock = new AwaitLock();
            this._transactionLock = () => {
                return lock;
            };
            this._transactionContext = null;

            if (!!createNewParams.config && !!createNewParams.config.debugMode && !!createNewParams.config.debugMode.instanceName && !!createNewParams.globalScopeAccessor) {
                if (!createNewParams.globalScopeAccessor.uniqueObjectIsDefined(createNewParams.config.debugMode.instanceName)) {
                    createNewParams.globalScopeAccessor.defineUniqueObject(createNewParams.config.debugMode.instanceName, new DebuggableEndpoint(createNewParams.absolutePath, async () => {
                        const transaction = await this.createTransaction();
                        const debugAssets = this._assets.map(a => {
                            return {
                                publicName: a.publicName,
                                containerPath: a.containerPath,
                                isDirectory: a.isDirectory,
                                isDeleted: a.isDeleted,
                                infoTimestamp: a.infoTimestamp,
                                delta: {
                                    oldPath: a.delta.oldPath,
                                    newPath: a.delta.newPath,
                                    type: a.delta.type,
                                    timestamp: a.delta.timestamp,
                                    assetType: a.delta.assetType,
                                    detail: a.delta.detail,
                                    trackingKey: a.delta.trackingKey
                                }
                            }
                        });
                        transaction.cancel();
                        return debugAssets;
                    }));
                }
            }
        } else if (!!createTransactionParams) {
            this._isTransaction = true;

            this._assets = new Array<YfsAsset>();
            createTransactionParams._assets.forEach(a => {
                if (a.isDirectory) {
                    const asDir = a as IYfsDirectory;
                    if (asDir.isSymlink) {
                        YfsSymlink.duplicate((asDir as YfsSymlink), this.getSymlinkTarget.bind(this)).then(dup => {
                            this._assets.push(dup);
                        });
                    } else {
                        YfsDirectory.duplicate(asDir, this.getContents.bind(this)).then(dup => {
                            this._assets.push(dup);
                        });
                    }
                } else {
                    YfsFile.duplicate(a as IYfsFile).then(dup => {
                        this._assets.push(dup);
                    });
                }
            });
            
            this._deltas = JSON.parse(JSON.stringify(createTransactionParams._deltas));
            this._watchers = {};
            this.absolutePath = createTransactionParams.absolutePath;
            this._disableLazyLoad = createTransactionParams._disableLazyLoad;
            this._remoteResolver = createTransactionParams._remoteResolver;
            this._pathResolver = new PathResolver();
            this._transactionLock = () => {
                return createTransactionParams._transactionLock();
            };
            this._transactionContext = createTransactionParams;
        } else {
            throw new Error('Invalid constructor');
        }
    }

    // private async directoryExists(path: string): Promise<boolean> {

    // }
    
    private async exists(pathInput: string): Promise<'dir' | 'file' | false> {
        const path = this._pathResolver.resolve(pathInput);
        if (path === '/') {
            return 'dir';
        } else {
            const index = await this.indexOfAsset(path);
            if (index > -1) {
                return this._assets[index].isDirectory ? 'dir' : 'file';
            } else {
                return false;
            }
        }
    }
    
    // private async assetDoesNotExist(path: string): Promise<boolean> {
        
    // }

    private async indexOfAsset(fullPathInput: string, deleted?: boolean): Promise<number> {
        const fullPath = this._pathResolver.resolve(fullPathInput);
        let index = this._assets.findIndex(a => AssetNameParser.joinPath(a.containerPath, a.publicName).toLowerCase() === fullPath.toLowerCase());
        if (index < 0 && this._isTransaction === true) {
            const contextIndex = this._transactionContext!._assets.findIndex(a => AssetNameParser.joinPath(a.containerPath, a.publicName).toLowerCase() === fullPath.toLowerCase());
            const isDeleted = this._deltas.some((d, di, da) => d.type === YfsDeltaType.Delete && d.newPath.toLowerCase() === fullPath.toLowerCase()
                && !da.some((d2) => d2.type !== YfsDeltaType.Delete && d2.timestamp > d.timestamp && d2.newPath.toLowerCase() === fullPath.toLowerCase()));
            const deletedMatch = deleted === undefined
                ? !isDeleted
                : isDeleted === deleted;
            if (contextIndex > -1 && deletedMatch) {
                index = contextIndex;
            }
        }
        return index;
    }

    // private joinPath(...parts: Array<string>): string {

    // }
    // private joinPath2(...parts: Array<string | {
    //     readonly type: 'dir' | 'file';
    //     readonly value: string;
    // }>): string {

    // }

    private async internalCreateDirectory(containerPathInput: string, name: string, isLoaded?: boolean): Promise<YfsStatus> {
        const containerPath = this._pathResolver.resolve(containerPathInput);
        let status = YfsStatus.UnexpectedError;

        if (AssetNameParser.validateName(name)) {
            const existing = await this.exists(AssetNameParser.joinPath(containerPath, name));

            if (existing !== false) {
                status = YfsStatus.AssetAlreadyExists;
            } else {
                const container = await this.exists(containerPath);
                if (container === 'dir') {
                    const newDir = await YfsDirectory.createNew(containerPath, name, isLoaded !== false, false, this.getContents.bind(this));
                    this.pushAsset(newDir);
                    status = YfsStatus.OK;
                } else {
                    status = YfsStatus.AssetNotFound;
                }
            }
        } else {
            status = YfsStatus.IllegalValue;
        }

        return status;
    }

    private async getContents(containerPathInput: string): Promise<Array<YfsAsset>> {
        const containerPath = this._pathResolver.resolve(containerPathInput);
        return this._assets.filter(a => a.containerPath.toLowerCase().startsWith(containerPath.toLowerCase()));
    }

    private pushAsset(asset: YfsAsset): number {
        this._deltas.push(asset.delta);
        this.notifyWatchers(asset.delta);
        return this._assets.push(asset);
    }

    private pushDelta(delta: YfsDelta): number {
        const n = this._deltas.push(delta);
        this.notifyWatchers(delta);
        return n;
    }
    
    private pushDeltas(deltas: Array<YfsDelta>): number {
        return deltas.map(d => this.pushDelta(d)).reduce((x, y) => x + y, 0);
    }
    // private pushAsset2(asset: YfsAsset): number {
    //     const fullPath = AssetNameParser.joinPath(asset.containerPath, asset.publicName).toLowerCase();
    //     const symbolicPaths = this._symbolicPaths.filter(s => s.targetPath.toLowerCase().startsWith(fullPath));
    //     if (!!symbolicPath) {
    //         return path.replace(symbolicPath.linkPath, symbolicPath.targetPath);
    //     } else {
    //         return path;
    //     }
    //     this._deltas.push(asset.delta);
    //     this.notifyWatchers(asset.delta);
    //     return this._assets.push(asset);
    // }

    private notifyWatchers(delta: YfsDelta): void {
        setTimeout(() => {
            Object.keys(this._watchers).forEach(k => {
                if (delta.oldPath.startsWith(this._watchers[k].path)
                    || delta.newPath.startsWith(this._watchers[k].path)) {
                        this._watchers[k].subscriber(JSON.parse(JSON.stringify(delta)));
                    }
            });
        });
    }

    private getSymlinkTarget(targetPath: string): IYfsDirectory | null {
        const asset = this._assets.find(a => a.isDirectory && AssetNameParser.joinPath(a.containerPath, a.publicName).toLowerCase() === targetPath.toLowerCase());
        if (!!asset) {
            return asset as IYfsDirectory;
        } else {
            return null;
        }
    }

    private isAssetDeleted(asset: YfsAsset, assets: Array<YfsAsset>): boolean {
        let isDeleted = false;
        let current: YfsAsset | undefined = asset;

        while (!isDeleted && !!current) {
            isDeleted = current.isDeleted;
            current = assets.find(a => AssetNameParser.joinPath(a.containerPath, a.publicName).toLowerCase() === current!.containerPath.toLowerCase());
        }

        return isDeleted;
    }

    private isDeltaContainerPathMatch(containerPathStartsWith: string, delta: YfsDelta): boolean {
        try {
            if (!!delta.detail) {
                return DiffUtil.parseContextualContainerPath(delta.detail).toLowerCase().startsWith(containerPathStartsWith.toLowerCase());
            } else {
                return false;
            }
        } catch (ex) {
            return false;
        }
    }

    private getEarlierDeltaIndicesForAsset(lastPath: string, timestamp: number, workingIndices: Array<number>): Array<number> {
        const previousIndex = this._deltas.findIndex(d => d.timestamp < timestamp && d.newPath === lastPath);
        if (previousIndex > -1) {
            const previous = this._deltas[previousIndex];
            if (this._deltas[previousIndex].type === YfsDeltaType.Create) {
                return workingIndices.concat(previousIndex);
            } else {
                return this.getEarlierDeltaIndicesForAsset(previous.oldPath, previous.timestamp, workingIndices.concat(previousIndex));
            }
        } else {
            return workingIndices;
        }
    }

    private async buildAssetFromDeltas(pathAtDeletion: string, deletionTimestamp: number): Promise<{
        readonly asset: YfsAsset;
        readonly latestDelta: YfsDelta;
    }> {
        const indices = this.getEarlierDeltaIndicesForAsset(pathAtDeletion, deletionTimestamp, []).sort((a, b) => this._deltas[a].timestamp - this._deltas[b].timestamp);
        const workingAsset = {
            publicName: '',
            containerPath: '',
            isDirectory: false,
            isDeleted: false,
            isLoaded: true,
            isSymlink: false,
            targetPath: undefined as string | undefined,
            content: undefined as string | undefined,
            title: undefined as string | undefined,
            extension: undefined as string | undefined,
            timestamp: -1
        };

        let latestDelta: YfsDelta | null = null;

        indices.forEach((index, ii, ia) => {
            const delta = this._deltas[index];
            if (ii === 0 && delta.type === YfsDeltaType.Create) {
                workingAsset.isDirectory = delta.assetType === YfsDeltaAssetType.DirectoryLoaded || delta.assetType === YfsDeltaAssetType.DirectoryNotLoaded;
                workingAsset.isSymlink = delta.assetType === YfsDeltaAssetType.SymlinkLoaded || delta.assetType === YfsDeltaAssetType.SymlinkNotLoaded;
                workingAsset.isLoaded = delta.assetType === YfsDeltaAssetType.DirectoryLoaded || delta.assetType === YfsDeltaAssetType.SymlinkLoaded;
            } else if (ii === ia.length - 1) {
                latestDelta = {
                    oldPath: delta.oldPath,
                    newPath: delta.newPath,
                    type: delta.type,
                    timestamp: Date.now(),
                    assetType: delta.assetType,
                    detail: delta.detail,
                    trackingKey: delta.trackingKey
                }
            }
            
            workingAsset.timestamp = delta.timestamp;

            const lastSeparatorIndex = delta.newPath.lastIndexOf('/');
            const deltaContainerPath = lastSeparatorIndex > -1
                ? delta.newPath.substring(0, lastSeparatorIndex)
                : '';
            const deltaPublicName = lastSeparatorIndex > -1
                ? delta.newPath.substring(lastSeparatorIndex + 1)
                : delta.newPath;
            workingAsset.containerPath = deltaContainerPath;
            workingAsset.publicName = deltaPublicName;
            
            if (workingAsset.isSymlink && !!delta.detail) {
                workingAsset.targetPath = delta.detail;
            } else if (!workingAsset.isDirectory) {
                const lastDotIndex = deltaPublicName.lastIndexOf('.');
                workingAsset.title = deltaPublicName.substring(0, lastDotIndex);
                workingAsset.extension = deltaPublicName.substring(lastDotIndex + 1);
                workingAsset.content = DiffUtil.applyPatch(delta.detail || '', workingAsset.content || '');
            }
        });

        let asset: YfsAsset | null = null;
        if (workingAsset.isSymlink) {
            asset = await YfsSymlink.createNew(workingAsset.containerPath, workingAsset.publicName, workingAsset.isLoaded, workingAsset.isDeleted, workingAsset.targetPath!, this.getSymlinkTarget.bind(this), workingAsset.timestamp);
        } else if (workingAsset.isDirectory) {
            asset = await YfsDirectory.createNew(workingAsset.containerPath, workingAsset.publicName, workingAsset.isLoaded, workingAsset.isDeleted, this.getContents.bind(this), workingAsset.timestamp);
        } else {
            asset = await YfsFile.createNew(workingAsset.containerPath, workingAsset.title!, workingAsset.extension!, workingAsset.content!, workingAsset.isDeleted, workingAsset.timestamp);
        }

        return {
            asset: asset!,
            latestDelta: latestDelta!
        }
    }

    private async bubbleDelete(containerPath: string, workingChanges: Array<{
        readonly index: number;
        readonly asset: YfsAsset;
    }>): Promise<Array<{
        readonly index: number;
        readonly asset: YfsAsset;
    }>> {
        const iterationContainerPaths = new Array<string>();
        const iterationChanges = new Array<{
            readonly index: number;
            readonly asset: YfsAsset;
        }>();

        for (let i = 0; i < this._assets.length; i++) {
            const asset = this._assets[i];
            if (asset.containerPath.toLowerCase().startsWith(containerPath)) {
                if (!workingChanges.some(a => a.index === i) && !iterationChanges.some(a => a.index === i)) {
                    let deletedAsset: YfsAsset;
                    if (asset.isDirectory) {
                        deletedAsset = await YfsDirectory.deleteExisting(asset as IYfsDirectory, this.getContents.bind(this));
                        iterationContainerPaths.push(AssetNameParser.joinPath(asset.containerPath, asset.publicName));
                    } else {
                        deletedAsset = await YfsFile.deleteExisting(asset as IYfsFile);
                    }

                    iterationChanges.push({
                        index: i,
                        asset: deletedAsset
                    });
                }
            }
        }
        const allNestedChanges = new Array<{
            readonly index: number;
            readonly asset: YfsAsset;
        }>();
        for (let i = 0; i < iterationContainerPaths.length; i++) {
            const nestedChanges = await this.bubbleDelete(iterationContainerPaths[i], iterationChanges);
            nestedChanges.forEach(nc => {
                if (!allNestedChanges.some(anc => anc.index === nc.index)) {
                    allNestedChanges.push(nc);
                }
            });
        }
        
        return iterationChanges.concat(...allNestedChanges);
    }

    private static async internalImportAsset(
        input: YfsAssetInput,
        getContents: (containerPathInput: string) => Promise<Array<YfsAsset>>,
        getSymlinkTarget: (targetPath: string) => IYfsDirectory | null,
        pushAsset: (asset: YfsAsset) => number,
        addSymbolicPath: (symPath: string, targetPath: string) => void): Promise<YfsStatus> {
        let status = YfsStatus.UnexpectedError;
        
        try {
            const a: YfsAsset = input.isDirectory && input.isSymlink === true
                ? await YfsSymlink.createNew(input.containerPath, input.name, input.isLoaded !== false, input.isDeleted === true, input.targetPath, (targetPath) => {
                    return getSymlinkTarget(targetPath);
                }, !!input.delta ? input.delta.timestamp : undefined)
                : input.isDirectory
                    ? await YfsDirectory.createNew(input.containerPath, input.name, input.isLoaded !== false, input.isDeleted === true, (containerPathInput) => {
                        return getContents(containerPathInput);
                    }, !!input.delta ? input.delta.timestamp : undefined)
                    : await YfsFile.createNew(input.containerPath, input.title, input.extension, input.content || '', input.isDeleted === true, !!input.delta ? input.delta.timestamp : undefined);
            pushAsset(a);
            if (a.isDirectory && (a as IYfsDirectory).isSymlink) {
                addSymbolicPath(AssetNameParser.joinPath(a.containerPath, a.publicName), (a as IYfsSymlink).targetPath);
            }

            status = YfsStatus.OK;
        } catch (ex) { }

        return status;
    }
    
    // private getRealPath(path: string): string {
    //     const symbolicPath = this._symbolicPaths.find(s => path.toLowerCase().startsWith(s.linkPath.toLowerCase()));
    //     if (!!symbolicPath) {
    //         return path.replace(symbolicPath.linkPath, symbolicPath.targetPath);
    //     } else {
    //         return path;
    //     }
    // }

    // private readonly _symbolicPaths: Array<{
    //     readonly linkPath: string;
    //     readonly targetPath: string;
    // }>;
    private _isTransaction: boolean | 'disposed';
    private readonly _transactionContext: Yfs | null;
    private readonly _transactionLock: () => AwaitLock;
    private readonly _pathResolver: PathResolver;
    private readonly _disableLazyLoad: boolean;
    private readonly _remoteResolver: YfsRemoteResolver;
    private readonly _watchers: { [handle: string]: {
        readonly path: string;
        readonly subscriber: (delta: YfsDelta) => void;
    }};
    private readonly _deltas: Array<YfsDelta>;
    // private readonly _assets: AssetsArray;
    private readonly _assets: Array<YfsAsset>;
}