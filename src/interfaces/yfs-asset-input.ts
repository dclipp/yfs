import { YfsDelta } from './yfs-delta';

export type YfsAssetInput = {
    readonly name: string;
    readonly containerPath: string;
    readonly isDirectory: true;
    readonly isDeleted?: boolean;
    readonly delta?: YfsDelta;
    readonly isLoaded?: boolean;
    readonly isSymlink?: false;
} | {
    readonly name: string;
    readonly containerPath: string;
    readonly isDirectory: true;
    readonly isDeleted?: boolean;
    readonly delta?: YfsDelta;
    readonly isLoaded?: boolean;
    readonly isSymlink: true;
    readonly targetPath: string;
} | {
    readonly containerPath: string;
    readonly isDirectory: false;
    readonly isDeleted?: boolean;
    readonly delta?: YfsDelta;
    readonly title: string;
    readonly extension: string;
    readonly content?: string;
}