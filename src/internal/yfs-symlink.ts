import { YfsAssetInput } from '../interfaces/yfs-asset-input';
import { YfsDelta } from '../interfaces/yfs-delta';
import { YfsDeltaAssetType } from '../interfaces/yfs-delta-asset-type';
import { YfsDeltaType } from '../interfaces/yfs-delta-type';
import { YfsDirectory as IIYfsDirectory } from '../interfaces/yfs-directory';
import { YfsSymlink as IYfsSymlink } from '../interfaces/yfs-symlink';
import { AssetNameParser } from './asset-name-parser';
import { Utils } from './utils';

export class YfsSymlink implements IYfsSymlink {
    public readonly targetPath: string;
    public readonly isSymlink: boolean;

    public readonly isLoaded: boolean;
    public readonly publicName: string;
    public readonly containerPath: string;
    public readonly isDirectory: boolean;
    public readonly isDeleted: boolean;

    public readonly infoTimestamp: number;
    public readonly delta: YfsDelta;

    public computeHash(): Promise<string> {
        return this.target.computeHash();
    }

    public asInput(): YfsAssetInput {
        return {
            name: this.publicName,
            containerPath: this.containerPath,
            isDirectory: true,
            isDeleted: this.isDeleted,
            delta: JSON.parse(JSON.stringify(this.delta)),
            isLoaded: this.isLoaded,
            isSymlink: true,
            targetPath: this.targetPath
        }
    }

    private get target(): IIYfsDirectory {
        const t = this._getTarget(this.targetPath);
        if (!!t) {
            return t;
        } else {
            throw new Error('Failed to get target');
        }
    }

    private readonly _getTarget: (targetPath: string) => (IIYfsDirectory | null);

    private constructor(params: {
        readonly isLoaded: boolean,
        readonly publicName: string,
        readonly containerPath: string,
        readonly isDirectory: boolean,
        readonly isDeleted: boolean,
        readonly infoTimestamp: number,
        readonly delta: YfsDelta,
        readonly targetPath: string
    }, getTarget: (targetPath: string) => (IIYfsDirectory | null)) {
        this.isLoaded = params.isLoaded;
        this.publicName = params.publicName;
        this.containerPath = params.containerPath;
        this.isDirectory = params.isDirectory;
        this.isDeleted = params.isDeleted;
        this.infoTimestamp = params.infoTimestamp;
        this.delta = params.delta;
        this.targetPath = params.targetPath;
        this.isSymlink = true;
        this._getTarget = getTarget;
    }

    public static async createNew(containerPath: string, name: string, isLoaded: boolean, isDeleted: boolean, targetPath: string, getTarget: (targetPath: string) => (IIYfsDirectory | null), versionTimestamp?: number): Promise<IYfsSymlink> {
        const fullName = AssetNameParser.parseFullDirName(name);
        return new YfsSymlink({
            targetPath: targetPath,
            isLoaded: isLoaded,
            publicName: fullName,
            containerPath: containerPath,
            isDirectory: true,
            isDeleted: isDeleted,
            infoTimestamp: Date.now(),
            delta: {
                detail: targetPath,
                oldPath: '',
                newPath: AssetNameParser.joinPath(containerPath, fullName),
                type: YfsDeltaType.Create,
                timestamp: versionTimestamp === undefined
                    ? Date.now()
                    : versionTimestamp,
                assetType: YfsSymlink.getAssetType(isLoaded),
                trackingKey: Utils.createUuid()
            }
        }, getTarget);
    }

    public static async updateExistingContainerPath(existing: IYfsSymlink, newContainerPath: string, getTarget: (targetPath: string) => (IIYfsDirectory | null)): Promise<IYfsSymlink> {
        return new YfsSymlink({
            targetPath: existing.targetPath,
            isLoaded: existing.isLoaded,
            publicName: existing.publicName,
            containerPath: newContainerPath,
            isDirectory: existing.isDirectory,
            isDeleted: existing.isDeleted,
            infoTimestamp: existing.infoTimestamp,
            delta: {
                oldPath: AssetNameParser.joinPath(existing.containerPath, existing.publicName),
                newPath: AssetNameParser.joinPath(newContainerPath, existing.publicName),
                timestamp: Date.now(),
                type: YfsDeltaType.Move,
                assetType: YfsSymlink.getAssetType(existing.isLoaded),
                trackingKey: existing.delta.trackingKey
            }
        }, getTarget);
    }

    public static async renameExisting(existing: IYfsSymlink, fullNewName: string, getTarget: (targetPath: string) => (IIYfsDirectory | null)): Promise<IYfsSymlink> {
        const fullName = AssetNameParser.parseFullDirName(fullNewName);
        return new YfsSymlink({
            targetPath: existing.targetPath,
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
                assetType: YfsSymlink.getAssetType(existing.isLoaded),
                trackingKey: existing.delta.trackingKey
            }
        }, getTarget);
    }

    public static async deleteExisting(existing: IYfsSymlink, getTarget: (targetPath: string) => (IIYfsDirectory | null)): Promise<IYfsSymlink> {
        if (existing.isDeleted) {
            return existing;//TODO err?
        } else {
            return new YfsSymlink({
                targetPath: existing.targetPath,
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
                    assetType: YfsSymlink.getAssetType(existing.isLoaded),
                    trackingKey: existing.delta.trackingKey
                }
            }, getTarget);
        }
    }

    public static async duplicate(existing: IYfsSymlink, getTarget: (targetPath: string) => (IIYfsDirectory | null), replaceDelta?: YfsDelta): Promise<IYfsSymlink> {
        return new YfsSymlink({
            targetPath: existing.targetPath,
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
                    assetType: YfsSymlink.getAssetType(existing.isLoaded),
                    trackingKey: !!replaceDelta.trackingKey ? replaceDelta.trackingKey : existing.delta.trackingKey
                }
                : {
                    oldPath: existing.delta.oldPath,
                    newPath: existing.delta.newPath,
                    type: existing.delta.type,
                    timestamp: Date.now(),
                    detail: existing.delta.detail,
                    assetType: YfsSymlink.getAssetType(existing.isLoaded),
                    trackingKey: existing.delta.trackingKey
                }
        }, getTarget);
    }

    private static getAssetType(isLoaded: boolean): YfsDeltaAssetType {
        return isLoaded ? YfsDeltaAssetType.SymlinkLoaded : YfsDeltaAssetType.SymlinkNotLoaded;
    }
}