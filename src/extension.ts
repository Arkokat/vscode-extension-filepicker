import * as vscode from 'vscode';
import { existsSync, lstatSync, readdirSync, stat, Stats } from 'fs';
import * as path from 'path';
import { FilePickerCache } from './cache';
import { lstat, readdir } from 'fs/promises';
import { doesNotMatch } from 'assert';
import { QuickPickItem } from 'vscode';

let cache = new FilePickerCache;

class FileInfo {
	isDirectory: boolean;
	relativePath: string;
	path: string;
	name: string;

	constructor(isDirectory: boolean, relativePath: string, path: string, name: string) {
		this.isDirectory = isDirectory;
		this.relativePath = relativePath;
		this.path = path;
		this.name = name;
	}
};

function getFiles(dir: string, relativePath: string = '') {
	return new Promise<{ name: string, relative: string }[]>((resolve, reject) => {
		readdir(dir).then((files: string[]) => {
			return files.map((file) => {
				let filePath = path.join(dir, file);
				return new Promise<FileInfo>((resolve, reject) => {
					lstat(filePath).then((value) => {
						resolve(new FileInfo(value.isDirectory(), path.join(relativePath, file), filePath, file));
					}).catch((reason) => {
						reject(reason);
					});
				});
			});
		}).then(stats => {
			return Promise.all(stats);
		}).then(stats => {
			return stats.map((fileInfo) => {
				if (fileInfo.isDirectory) {
					return getFiles(fileInfo.path, fileInfo.relativePath);
				} else {
					return new Promise<{ name: string, relative: string }[]>((resolve, reject) => {
						resolve([{ name: fileInfo.name, relative: fileInfo.relativePath }]);
					});
				}
			});
		}).then((filePromises) => {
			return Promise.all(filePromises);
		}).then((paths) => {
			resolve(paths.flatMap(filePath => {
				return filePath;
			}));
		}).catch(() => {
			reject();
		});
	});
}

async function select(args: {
	dirPath: string,
	storeCache: boolean,
	filters: [string],
	placeHolder: string
}) {
	var dirPath = args.dirPath;
	var rawFilters = args.filters;

	var filters = rawFilters.map((value) => {
		return new RegExp(value);
	});

	if (dirPath === '' || dirPath === undefined) {
		throw new Error('No path specified');
	}

	const data = await getFiles(dirPath);
	const files = data.map((fileItem) => {
		return { label: fileItem.relative, absolutePath: path.join(dirPath, fileItem.relative), fileName: fileItem.name };
	}).filter((item) => {
		return filters.some((filter) => {
			return filter.exec(item.fileName);
		});
	});


	return await vscode.window.showQuickPick(files, {
		canPickMany: false,
		ignoreFocusOut: true,
		title: 'Filtered Picker',
		placeHolder: args.placeHolder,
	}).then((item) => {
		return item?.absolutePath;
	});
}

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "filepicker" is now active!');
	
	let disposable = vscode.commands.registerCommand('filepicker.select', select, context);

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
