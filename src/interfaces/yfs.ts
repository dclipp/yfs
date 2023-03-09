import { YfsContext } from './yfs-context';
import { YfsOutput } from './yfs-output';
import { YfsTransaction } from './yfs-transaction';

export interface Yfs extends YfsContext {
    openDirectory(path: string): Promise<YfsOutput<Yfs>>;
    createTransaction(): Promise<YfsTransaction>;
}