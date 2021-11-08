import { existsSync, fstat, fstatSync, lstatSync } from "fs";
import { readdir, lstat } from "fs/promises";
import path = require("path");

export class FileInfo {
    filePath!: string;
    fileRelativePath!: string;
    fileName!: string;

    isDirectory?: boolean;

    constructor(filePath: string, fileRelativePath: string, fileName: string, isDirectory?: boolean) {
        this.filePath = filePath;
        this.fileRelativePath = fileRelativePath;
        this.fileName = fileName;
        this.isDirectory = isDirectory;
    }
}

export function getDirectory(dir: string) {
    if (!existsSync(dir) || !lstatSync(dir).isDirectory()) {
        throw new Error(`${dir} is not a directory`);
    }

    return new Directory(dir);
}

export interface IDirectory {
    getFiles(): Promise<FileInfo[]>
}

function fillMissingFileInfo(fileInfo: FileInfo) {
    return lstat(fileInfo.filePath).then((stat) => {
        fileInfo.isDirectory = stat.isDirectory();
        return fileInfo;
    });
}

function fillMissingFileInfos(fileInfos: FileInfo[]) {
    return new Promise<FileInfo[]>((resolve, reject) => {
        return Promise.all(fileInfos.map(fillMissingFileInfo));
    });
}

class Directory implements IDirectory {
    dir!: string;

    constructor(dir: string) {
        this.dir = dir;
    }

    getFiles(): Promise<FileInfo[]> {
        var context = this;

        return readdir(this.dir, { withFileTypes: true }).then((files) => {
            return files.map((file) => {
                return new FileInfo(path.join(context.dir, file.name), file.name, file.name, file.isDirectory());
            });
        }).then((data) => this.recurseIntoSubDirectories(context, data)).then((data) => this.flatSubDirectories(context, data));
    }

    private flatSubDirectories(context: Directory, subDirectoriesInfos: FileInfo[][]): Promise<FileInfo[]> {
        return new Promise<FileInfo[]>((resolve, reject) => {
            resolve(subDirectoriesInfos.flatMap((fileInfos) => {
                return fileInfos.map((fileInfo) => {
                    return new FileInfo(fileInfo.filePath, fileInfo.fileRelativePath, fileInfo.fileName, fileInfo.isDirectory);
                });
            }));
        });
    }

    private recurseIntoSubDirectories(context: Directory, fileInfos: FileInfo[]) {
        return Promise.all(fileInfos.map((fileInfo) => {
            if (fileInfo.isDirectory) {
                return getDirectory(fileInfo.filePath).getFiles().then((data) => {
                    return data.map((fileInfo) => {
                        fileInfo.fileRelativePath = path.join(context.dir, fileInfo.fileRelativePath);
                        return fileInfo;
                    });
                });
            } else {
                return new Promise<FileInfo[]>((resolve, reject) => {
                    resolve([fileInfo]);
                });
            }
        }));
    }
}