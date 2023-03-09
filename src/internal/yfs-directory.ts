import md5 from 'md5';
import { YfsAsset } from '../interfaces/yfs-asset';
import { YfsAssetInput } from '../interfaces/yfs-asset-input';
import { YfsDelta } from '../interfaces/yfs-delta';
import { YfsDeltaAssetType } from '../interfaces/yfs-delta-asset-type';
import { YfsDeltaType } from '../interfaces/yfs-delta-type';
import { YfsDirectory as IYfsDirectory } from '../interfaces/yfs-directory';
import { AssetNameParser } from './asset-name-parser';
import { Utils } from './utils';

export class YfsDirectory implements IYfsDirectory {
    public readonly isLoaded: boolean;
    public readonly isSymlink: boolean;
    public readonly publicName: string;
    public readonly containerPath: string;
    public readonly isDirectory: boolean;
    public readonly isDeleted: boolean;
    public readonly infoTimestamp: number;
    public readonly delta: YfsDelta;

    public async computeHash(): Promise<string> {
        const contentHashes = new Array<string>();
        const contents = await this._getContents(AssetNameParser.joinPath(this.containerPath, this.publicName));
        for (let i = 0; i < contents.length; i++) {
            const current = contents[i];
            if (current.isDirectory) {
                const hash = await current.computeHash();
                contentHashes.push(`dir:${current.publicName}:${hash}`);
            } else {
                const hash = await current.computeHash();
                contentHashes.push(`file:${current.publicName}:${hash}`);
            }
        }

        return md5(contentHashes.join(';'));
    }

    public asInput(): YfsAssetInput {
        return {
            name: this.publicName,
            containerPath: this.containerPath,
            isDirectory: true,
            isDeleted: this.isDeleted,
            delta: JSON.parse(JSON.stringify(this.delta)),
            isLoaded: this.isLoaded,
            isSymlink: false
        }
    }

    private readonly _getContents: (containerPath: string) => Promise<Array<YfsAsset>>;

    private constructor(params: {
        readonly isLoaded: boolean,
        readonly publicName: string,
        readonly containerPath: string,
        readonly isDirectory: boolean,
        readonly isDeleted: boolean,
        readonly infoTimestamp: number,
        readonly delta: YfsDelta
    }, getContents: (containerPath: string) => Promise<Array<YfsAsset>>) {
        this.isLoaded = params.isLoaded;
        this.publicName = params.publicName;
        this.containerPath = params.containerPath;
        this.isDirectory = params.isDirectory;
        this.isDeleted = params.isDeleted;
        this.infoTimestamp = params.infoTimestamp;
        this.delta = params.delta;
        this._getContents = getContents;
        this.isSymlink = false;
    }

    public static async createNew(containerPath: string, name: string, isLoaded: boolean, isDeleted: boolean, getContents: (containerPath: string) => Promise<Array<YfsAsset>>, versionTimestamp?: number): Promise<IYfsDirectory> {
        const fullName = AssetNameParser.parseFullDirName(name);
        return new YfsDirectory({
            isLoaded: isLoaded,
            publicName: fullName,
            containerPath: containerPath,
            isDirectory: true,
            isDeleted: isDeleted,
            infoTimestamp: Date.now(),
            delta: {
                oldPath: '',
                newPath: AssetNameParser.joinPath(containerPath, fullName),
                type: YfsDeltaType.Create,
                timestamp: versionTimestamp === undefined
                    ? Date.now()
                    : versionTimestamp,
                assetType: YfsDirectory.getAssetType(isLoaded),
                trackingKey: Utils.createUuid()
            }
        }, getContents);
    }

    public static async updateExistingContainerPath(existing: IYfsDirectory, newContainerPath: string, getContents: (containerPath: string) => Promise<Array<YfsAsset>>): Promise<IYfsDirectory> {
        return new YfsDirectory({
            isLoaded: existing.isLoaded,
            publicName: existing.publicName,
            containerPath: newContainerPath,
            isDirectory: existing.isDirectory,
            isDeleted: existing.isDeleted,
            infoTimestamp: existing.infoTimestamp,
            delta: {
                oldPath: AssetNameParser.joinPath(existing.containerPath, existing.publicName),
                newPath: AssetNameParser.joinPath(newContainerPath, existing.publicName),
                type: YfsDeltaType.Move,
                timestamp: Date.now(),
                assetType: YfsDirectory.getAssetType(existing.isLoaded),
                trackingKey: existing.delta.trackingKey
            }
        }, getContents);
    }

    public static async renameExisting(existing: IYfsDirectory, fullNewName: string, getContents: (containerPath: string) => Promise<Array<YfsAsset>>): Promise<IYfsDirectory> {
        const fullName = AssetNameParser.parseFullDirName(fullNewName);
        return new YfsDirectory({
            isLoaded: existing.isLoaded,
            publicName: fullName,
            containerPath: existing.containerPath,
            isDirectory: existing.isDirectory,
            isDeleted: existing.isDeleted,
            infoTimestamp: existing.infoTimestamp,
            delta: {
                oldPath: AssetNameParser.joinPath(existing.containerPath, existing.publicName),
                newPath: AssetNameParser.joinPath(existing.containerPath, fullName),
                type: YfsDeltaType.Rename,
                timestamp: Date.now(),
                detail: fullNewName,
                assetType: YfsDirectory.getAssetType(existing.isLoaded),
                trackingKey: existing.delta.trackingKey
            }
        }, getContents);
    }

    public static async deleteExisting(existing: IYfsDirectory, getContents: (containerPath: string) => Promise<Array<YfsAsset>>): Promise<IYfsDirectory> {
        if (existing.isDeleted) {
            return existing;//TODO err?
        } else {
            return new YfsDirectory({
                isLoaded: existing.isLoaded,
                publicName: existing.publicName,
                containerPath: existing.containerPath,
                isDirectory: existing.isDirectory,
                isDeleted: true,
                infoTimestamp: existing.infoTimestamp,
                delta: {
                    oldPath: AssetNameParser.joinPath(existing.containerPath, existing.publicName),
                    newPath: AssetNameParser.joinPath(existing.containerPath, existing.publicName),
                    timestamp: Date.now(),
                    type: YfsDeltaType.Delete,
                    assetType: YfsDirectory.getAssetType(existing.isLoaded),
                    trackingKey: existing.delta.trackingKey
                }
            }, getContents);
        }
    }

    public static async duplicate(existing: IYfsDirectory, getContents: (containerPath: string) => Promise<Array<YfsAsset>>, replaceDelta?: YfsDelta): Promise<IYfsDirectory> {
        return new YfsDirectory({
            isLoaded: existing.isLoaded,
            publicName: existing.publicName,
            containerPath: existing.containerPath,
            isDirectory: existing.isDirectory,
            isDeleted: existing.isDeleted,
            infoTimestamp: existing.infoTimestamp,
            delta: !!replaceDelta
            ? {
                oldPath: replaceDelta.oldPath,
                newPath: replaceDelta.newPath,
                type: replaceDelta.type,
                timestamp: replaceDelta.timestamp,
                detail: replaceDelta.detail,
                assetType: existing.delta.assetType,
                trackingKey: !!replaceDelta.trackingKey ? replaceDelta.trackingKey : existing.delta.trackingKey
            }
            : {
                oldPath: existing.delta.oldPath,
                newPath: existing.delta.newPath,
                type: existing.delta.type,
                timestamp: Date.now(),
                detail: existing.delta.detail,
                assetType: existing.delta.assetType,
                trackingKey: existing.delta.trackingKey
            }
        }, getContents);
    }

    public static async markExistingAsLoaded(existing: IYfsDirectory, getContents: (containerPath: string) => Promise<Array<YfsAsset>>): Promise<IYfsDirectory> {
        return new YfsDirectory({
            isLoaded: true,
            publicName: existing.publicName,
            containerPath: existing.containerPath,
            isDirectory: existing.isDirectory,
            isDeleted: existing.isDeleted,
            infoTimestamp: existing.infoTimestamp,
            delta: {
                oldPath: existing.delta.oldPath,
                newPath: existing.delta.newPath,
                timestamp: Date.now(),
                type: existing.delta.type,
                assetType: existing.delta.assetType,
                trackingKey: existing.delta.trackingKey
            }
        }, getContents);
    }

    private static getAssetType(isLoaded: boolean): YfsDeltaAssetType {
        return isLoaded ? YfsDeltaAssetType.DirectoryLoaded : YfsDeltaAssetType.DirectoryNotLoaded;
    }
}