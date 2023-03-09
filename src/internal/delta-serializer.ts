import { YfsDelta } from '../interfaces/yfs-delta';
import { YfsDeltaType } from '../interfaces/yfs-delta-type';

export class DeltaSerializer {
    // readonly oldPath: string;
    // readonly newPath: string;
    // readonly type: YfsDeltaType;
    // readonly timestamp: number;
    // readonly assetType: YfsDeltaAssetType;
    // readonly trackingKey: string;
    // readonly detail?: string;
    public static serialize(...deltas: Array<YfsDelta>): string {
        return deltas.map(d => DeltaSerializer.serializeSingleDelta(d)).reduce((x, y) => x + y, `D${deltas.length}`);
    }
    
    // public static deserialize(serializedPayload: string): Array<YfsDelta> {
        
    // }

    private static serializeSingleDelta(delta: YfsDelta): string {
        /*
            TYPE
            TIMESTAMP
            OLDPATH
            NEWPATH
            DETAIL
        */

        let serializedPayload = DeltaSerializer.serializeType(delta.type);
        serializedPayload += delta.timestamp.toString(16);//.padStart();

        serializedPayload += DeltaSerializer.serializePaths(delta.oldPath, delta.newPath);

        serializedPayload += delta.assetType.valueOf();
        
        serializedPayload += delta.trackingKey;

        serializedPayload += (!!delta.detail ? ('*' + delta.detail) : '!');//TODO ?? DeltaSerializer.

        return serializedPayload;
    }

    private static serializeType(type: YfsDeltaType): string {
        let st = '';
        switch (type) {
            case YfsDeltaType.Create:
                st = '0';
                break;
            case YfsDeltaType.Delete:
                st = '1';
                break;
            case YfsDeltaType.Modify:
                st = '2';
                break;
            case YfsDeltaType.Move:
                st = '3';
                break;
            case YfsDeltaType.Rename:
                st = '4';
                break;
        }

        if (st === '') {
            throw new Error(`unknown delta type '${type}'`);
        } else {
            return st;
        }
    }

    private static serializePaths(oldPath: string, newPath: string): string {
        let bestCommonMatch: string | null = null;
        for (let i = newPath.length; i > 0 && bestCommonMatch === null; i--) {
            const subPath = newPath.substring(0, i);
            if (oldPath.startsWith(subPath)) {
                bestCommonMatch = subPath;
            }
        }

        const sep = '$$';

        if (bestCommonMatch === null) {
            return `!${oldPath}${sep}${newPath}${sep}`;
        } else {
            const suffix = newPath.substring(bestCommonMatch.length);
            return `*${oldPath}${sep}${suffix}${sep}`;
        }
    }
}