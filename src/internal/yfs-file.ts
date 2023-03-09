import { YfsFile as IYfsFile } from '../interfaces/yfs-file';
import { AssetNameParser } from './asset-name-parser';
import md5 from 'md5';
import { YfsDelta } from '../interfaces/yfs-delta';
import { YfsDeltaType } from '../interfaces/yfs-delta-type';
import { YfsAssetInput } from '../interfaces/yfs-asset-input';
import { DiffUtil } from './diff-util';
import { YfsDeltaAssetType } from '../interfaces/yfs-delta-asset-type';
import { Utils } from './utils';

export class YfsFile implements IYfsFile {
    public readonly title: string;
    public readonly extension: string;
    public readonly content: string;
    public readonly publicName: string;
    public readonly containerPath: string;
    public readonly isDirectory: boolean;
    public readonly isDeleted: boolean;
    public readonly infoTimestamp: number;
    public readonly delta: YfsDelta;
    
    public async computeHash(): Promise<string> {
        return md5(this.content);
    }

    public asInput(): YfsAssetInput {
        return {
            containerPath: this.containerPath,
            isDirectory: false,
            isDeleted: this.isDeleted,
            delta: JSON.parse(JSON.stringify(this.delta)),
            title: this.title,
            extension: this.extension,
            content: this.content
        }
    }

    private constructor(params: {
        readonly title: string,
        readonly extension: string,
        readonly content: string,
        readonly publicName: string,
        readonly containerPath: string,
        readonly isDirectory: boolean,
        readonly isDeleted: boolean,
        readonly infoTimestamp: number
        readonly delta: YfsDelta
    }) {
        this.title = params.title;
        this.extension = params.extension;
        this.content = params.content;
        this.publicName = params.publicName;
        this.containerPath = params.containerPath;
        this.isDirectory = params.isDirectory;
        this.isDeleted = params.isDeleted;
        this.infoTimestamp = params.infoTimestamp;
        this.delta = params.delta;
    }

    public static async createNew(containerPath: string, title: string, extension: string, content: string, isDeleted: boolean, versionTimestamp?: number): Promise<IYfsFile> {
        const hash = md5('');
        const fullName = AssetNameParser.parseFullFileName({ title: title, extension: extension }, hash);
        return new YfsFile({
            title: fullName.normalizedTitle,
            extension: fullName.normalizedExtension,
            content: content,
            publicName: fullName.publicName,
            containerPath: containerPath,
            isDirectory: false,
            isDeleted: isDeleted,
            infoTimestamp: Date.now(),
            delta: {
                oldPath: '',
                newPath: AssetNameParser.joinPath(containerPath, fullName.publicName),
                type: YfsDeltaType.Create,
                detail: YfsFile.getContentDiff(containerPath, '', content),
                timestamp: versionTimestamp === undefined
                    ? Date.now()
                    : versionTimestamp,
                assetType: YfsDeltaAssetType.File,
                trackingKey: Utils.createUuid()
            }
        });
    }

    public static async updateExistingContainerPath(existing: IYfsFile, newContainerPath: string): Promise<IYfsFile> {
        return new YfsFile({
            title: existing.title,
            extension: existing.extension,
            content: existing.content,
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
                assetType: YfsDeltaAssetType.File,
                trackingKey: existing.delta.trackingKey
            }
        });
    }

    public static async renameExisting(existing: IYfsFile, fullNewName: string): Promise<IYfsFile> {
        const hash = await existing.computeHash();
        const fullName = AssetNameParser.parseFullFileName(fullNewName, hash);
        return new YfsFile({
            title: fullName.normalizedTitle,
            extension: fullName.normalizedExtension,
            content: existing.content,
            publicName: fullName.publicName,
            containerPath: existing.containerPath,
            isDirectory: existing.isDirectory,
            isDeleted: existing.isDeleted,
            infoTimestamp: existing.infoTimestamp,
            delta: {
                oldPath: AssetNameParser.joinPath(existing.containerPath, existing.publicName),
                newPath: AssetNameParser.joinPath(existing.containerPath, fullName.publicName),
                type: YfsDeltaType.Rename,
                timestamp: Date.now(),
                detail: fullNewName,
                assetType: YfsDeltaAssetType.File,
                trackingKey: existing.delta.trackingKey
            }
        });
    }

    public static async updateExistingContent(existing: IYfsFile, newContent: string): Promise<IYfsFile> {
        return new YfsFile({
            title: existing.title,
            extension: existing.extension,
            content: newContent,
            publicName: existing.publicName,
            containerPath: existing.containerPath,
            isDirectory: existing.isDirectory,
            isDeleted: existing.isDeleted,
            infoTimestamp: existing.infoTimestamp,
            delta: {
                oldPath: existing.delta.oldPath,
                newPath: existing.delta.newPath,
                type: YfsDeltaType.Modify,
                timestamp: Date.now(),
                detail: YfsFile.getContentDiff(existing.containerPath, existing.content, newContent),
                assetType: YfsDeltaAssetType.File,
                trackingKey: existing.delta.trackingKey
            }
        });
    }

    public static async deleteExisting(existing: IYfsFile): Promise<IYfsFile> {
        const hash = await existing.computeHash();
        if (existing.isDeleted) {
            return existing;//TODO err?
        } else {
            const fullName = AssetNameParser.parseFullFileName(existing.publicName, hash);
            return new YfsFile({
                title: existing.title,
                extension: existing.extension,
                content: existing.content,
                publicName: fullName.publicName,
                containerPath: existing.containerPath,
                isDirectory: existing.isDirectory,
                isDeleted: true,
                infoTimestamp: existing.infoTimestamp,
                delta: {
                    oldPath: AssetNameParser.joinPath(existing.containerPath, existing.publicName),
                    newPath: AssetNameParser.joinPath(existing.containerPath, existing.publicName),
                    type: YfsDeltaType.Delete,
                    timestamp: Date.now(),
                    assetType: YfsDeltaAssetType.File,
                    trackingKey: existing.delta.trackingKey
                }
            });
        }
    }

    public static async duplicate(existing: IYfsFile, replacements?: {
        readonly delta: YfsDelta;
        readonly content?: string;
    }): Promise<IYfsFile> {
        return new YfsFile({
            title: existing.title,
            extension: existing.extension,
            content: !!replacements && replacements.content !== undefined
                ? replacements.content
                : existing.content,
            publicName: existing.publicName,
            containerPath: existing.containerPath,
            isDirectory: existing.isDirectory,
            isDeleted: existing.isDeleted,
            infoTimestamp: existing.infoTimestamp,
            delta: !!replacements
                ? {
                    oldPath: replacements.delta.oldPath,
                    newPath: replacements.delta.newPath,
                    type: replacements.delta.type,
                    timestamp: replacements.delta.timestamp,
                    detail: replacements.delta.detail,
                    assetType: YfsDeltaAssetType.File,
                    trackingKey: !!replacements.delta.trackingKey ? replacements.delta.trackingKey : existing.delta.trackingKey
                }
                : {
                    oldPath: existing.delta.oldPath,
                    newPath: existing.delta.newPath,
                    type: existing.delta.type,
                    timestamp: Date.now(),
                    detail: existing.delta.detail,
                    assetType: YfsDeltaAssetType.File,
                    trackingKey: existing.delta.trackingKey
                }
        });
    }

    private static getContentDiff(contextualContainerPath: string, oldContent: string, newContent: string): string {
        return DiffUtil.createSerializedPatch(contextualContainerPath, oldContent, newContent);
    }
}