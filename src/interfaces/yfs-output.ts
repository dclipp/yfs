import { YfsStatus } from './yfs-status';

// export interface YfsOutput<TPayload> {
//     readonly status: YfsStatus;
//     readonly payload: TPayload | null;
// }
export type YfsOutput<TPayload> = {
    readonly status: YfsStatus.AssetNotFound | YfsStatus.AssetAlreadyExists | YfsStatus.IllegalValue | YfsStatus.SystemAssetPermissionDenied | YfsStatus.IOError | YfsStatus.AssetTypeMismatch | YfsStatus.AssetNotLoaded | YfsStatus.UnexpectedError;
    readonly payload: null;
} | {
    readonly status: YfsStatus.OK;
    readonly payload: TPayload;
}