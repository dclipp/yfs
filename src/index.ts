import { Yfs } from './interfaces/yfs';
import { Utils } from './internal/utils';
import { Yfs as _Yfs } from './internal/yfs';
import { YfsConfig } from './interfaces/config/yfs-config';
import { AssetNameParser } from './internal/asset-name-parser';
import { YfsAssetInput } from './interfaces/yfs-asset-input';
import { DeltaSerializer } from './internal/delta-serializer';
import { YfsDelta } from './interfaces/yfs-delta';
import { YfsGlobalScopeAccessor } from './interfaces/yfs-global-scope-accessor';

export { YfsStatus } from './interfaces/yfs-status';
export { YfsAsset } from './interfaces/yfs-asset';
export { YfsAssetInput } from './interfaces/yfs-asset-input';
export { Yfs } from './interfaces/yfs';
export { YfsContext } from './interfaces/yfs-context';
export { YfsConfig } from './interfaces/config/yfs-config';
export { YfsDeltaType } from './interfaces/yfs-delta-type';
export { YfsDelta } from './interfaces/yfs-delta';
export { YfsDirectory } from './interfaces/yfs-directory';
export { YfsFile } from './interfaces/yfs-file';
export { YfsSymlink } from './interfaces/yfs-symlink';
export { YfsOutput } from './interfaces/yfs-output';
export { YfsRemoteResolver } from './interfaces/remote/yfs-remote-resolver';
export { YfsRemoteRouter } from './interfaces/remote/yfs-remote-router';
export { YfsRoute } from './interfaces/remote/yfs-route';
export { YfsRemoteEndpoint } from './interfaces/remote/yfs-remote-endpoint';
export { YfsTransaction } from './interfaces/yfs-transaction';
export { YfsContentPatch } from './interfaces/yfs-content-patch';
export { YfsContentPatchSegment } from './interfaces/yfs-content-patch-segment';
export { DiffUtil as YfsDiffUtil } from './internal/diff-util';
export { YfsDebugAsset } from './interfaces/debug/yfs-debug-asset';
export { YfsDebuggableEndpoint } from './interfaces/debug/yfs-debuggable-endpoint';
export { YfsGlobalScopeAccessor } from './interfaces/yfs-global-scope-accessor';
export { YfsDeltaAssetType } from './interfaces/yfs-delta-asset-type';

export function load(assets?: Array<YfsAssetInput>, config?: YfsConfig, globalScopeAccessor?: YfsGlobalScopeAccessor): Yfs {
    return new _Yfs({
        absolutePath: '/',
        assets: assets,
        config: config,
        globalScopeAccessor: globalScopeAccessor
    });
}

export function createUuid(): string {
    return Utils.createUuid();
}

export function joinPath(...parts: Array<string>): string {
    return AssetNameParser.joinPath(...parts);
}

export function joinFileNameParts(title: string, extension: string): string {
    return AssetNameParser.joinFileNameParts(title, extension);
}

export function serializeDeltas(...deltas: Array<YfsDelta>): string {
    return DeltaSerializer.serialize(...deltas);
}