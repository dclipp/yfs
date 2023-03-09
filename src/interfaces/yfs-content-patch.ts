import { YfsContentPatchSegment } from './yfs-content-patch-segment';

export interface YfsContentPatch {
    readonly contextualContainerPath: string;
    readonly segments: Array<YfsContentPatchSegment>;
}