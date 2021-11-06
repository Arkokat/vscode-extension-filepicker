export class FilePickerCache {
    lastSelectedFile: Map<string, string>;

    constructor() {
        this.lastSelectedFile = new Map;
    }

    getLastSelectedFile(path: string) {
        return this.lastSelectedFile.get(path);
    }

    hasLastSelectedFile(path: string) {
        return this.lastSelectedFile.has(path);
    }

    storeSelectedFile(path: string, file: string) {
        return this.lastSelectedFile.set(path, file);
    }

    clearSelectedFile(path: string) {
        this.lastSelectedFile.delete(path);
    }
}