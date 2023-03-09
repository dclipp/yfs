export class Utils {
    public static createUuid(): string {
        let s = '';
        while (s.length < 36) {
            s += (Math.floor(Math.random() * 64) % 16).toString(16);
            if (s.length === 8 || s.length === 13 || s.length === 18 || s.length === 23) {
                s += '-';
            }
        }
        return s;
    }
}