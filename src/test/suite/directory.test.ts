import * as assert from 'assert';
import Sinon = require('sinon');
import fsPromises = require('fs/promises');
import fs = require('fs');
import * as vscode from 'vscode';
import { getDirectory } from '../../fs';
import { readdir } from 'fs/promises';
import { createSandbox } from 'sinon';
import path = require('path');

var sanbox: Sinon.SinonSandbox;
const MAIN_DIR = 'test';
const FILE = 'test.txt';
var lstatSyncStub: Sinon.SinonStub<[path: fs.PathLike, options?: fs.StatOptions | undefined], fs.Stats | fs.BigIntStats>;
var existsSyncStub: Sinon.SinonStub<[fs.PathLike], boolean>;
var readDirStub: Sinon.SinonStub<[path: fs.PathLike, options: fs.BaseEncodingOptions & { withFileTypes: true; }], Promise<fs.Dirent[]>>;

suite('FS Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Simple Directory Test directory doesn\'t exist', () => {
        existsSyncStub.withArgs(MAIN_DIR).returns(false);

        assert.throws(() => {
            getDirectory(MAIN_DIR);
        }, new Error("test is not a directory"));
    });

    test('Simple Directory is not a directory', () => {
        const STATS = sanbox.createStubInstance(fs.Stats);
        lstatSyncStub.withArgs(MAIN_DIR).returns(STATS);

        STATS.isDirectory.returns(false);

        assert.throws(() => {
            getDirectory(MAIN_DIR);
        }, new Error("test is not a directory"));
    });

    test('Simple Directory is not a directory both false', () => {
        const STATS = sanbox.createStubInstance(fs.Stats);

        existsSyncStub.withArgs(MAIN_DIR).returns(false);
        lstatSyncStub.withArgs(MAIN_DIR).returns(STATS);

        STATS.isDirectory.returns(false);

        assert.throws(() => {
            getDirectory(MAIN_DIR);
        }, new Error("test is not a directory"));
    });

    var generateDirStubs = (path: string, data: { name: string, isDir: boolean }[]) => {
        const DIRENTS = data.map((item) => {
            const DIRENT = sanbox.createStubInstance(fs.Dirent);

            DIRENT.isDirectory.returns(item.isDir);
            DIRENT.name = item.name;

            return DIRENT;
        });

        readDirStub.withArgs(path, { withFileTypes: true }).returns(new Promise<fs.Dirent[]>((resolve, reject) => {
            resolve(DIRENTS);
        }));

        const DIR_STATS = sanbox.createStubInstance(fs.Stats);
        existsSyncStub.withArgs(path).returns(true);
        lstatSyncStub.withArgs(path).returns(DIR_STATS);

        DIR_STATS.isDirectory.returns(true);
    };

    test('Directory with no subdirectories', (done) => {
        generateDirStubs(MAIN_DIR, [{ name: FILE, isDir: false }]);

        getDirectory(MAIN_DIR).getFiles().then((files) => {
            assert.strictEqual(files.length, 1);
            assert.strictEqual(files[0].fileName, FILE);
            assert.strictEqual(files[0].filePath, path.join(MAIN_DIR, FILE));
            assert.strictEqual(files[0].fileRelativePath, FILE);
            assert.strictEqual(files[0].isDirectory, false);

            done();
        });
    });

    test('Directory with empty subdirectory and no files', (done) => {
        generateDirStubs(MAIN_DIR, [{ name: MAIN_DIR, isDir: true }]);
        generateDirStubs(path.join(MAIN_DIR, MAIN_DIR), []);

        getDirectory(MAIN_DIR).getFiles().then((files) => {
            assert.strictEqual(files.length, 0);

            done();
        });
    });

    test('Directory with empty subdirectory and files', (done) => {
        generateDirStubs(MAIN_DIR, [{ name: MAIN_DIR, isDir: true }, { name: FILE, isDir: false }]);
        generateDirStubs(path.join(MAIN_DIR, MAIN_DIR), []);

        getDirectory(MAIN_DIR).getFiles().then((files) => {
            assert.strictEqual(files.length, 1);
            assert.strictEqual(files[0].fileName, FILE);
            assert.strictEqual(files[0].filePath, path.join(MAIN_DIR, FILE));
            assert.strictEqual(files[0].fileRelativePath, FILE);
            assert.strictEqual(files[0].isDirectory, false);

            done();
        });
    });

    test('Directory with subdirectory and files', (done) => {
        generateDirStubs(MAIN_DIR, [{ name: MAIN_DIR, isDir: true }, { name: FILE, isDir: false }]);
        generateDirStubs(path.join(MAIN_DIR, MAIN_DIR), [{ name: FILE, isDir: false }]);

        getDirectory(MAIN_DIR).getFiles().then((files) => {
            assert.strictEqual(files.length, 2);
            assert.strictEqual(files[0].fileName, FILE);
            assert.strictEqual(files[0].filePath, path.join(MAIN_DIR, MAIN_DIR, FILE));
            assert.strictEqual(files[0].fileRelativePath,  path.join(MAIN_DIR, FILE));
            assert.strictEqual(files[0].isDirectory, false);
            assert.strictEqual(files[1].fileName, FILE);
            assert.strictEqual(files[1].filePath, path.join(MAIN_DIR, FILE));
            assert.strictEqual(files[1].fileRelativePath, FILE);
            assert.strictEqual(files[1].isDirectory, false);

            done();
        });
    });

}).beforeEach(() => {
    sanbox = createSandbox();
    existsSyncStub = sanbox.stub(fs, "existsSync");
    lstatSyncStub = sanbox.stub(fs, "lstatSync");
    readDirStub = sanbox.stub(fsPromises, "readdir");

}).afterEach(() => {
    sanbox.restore();
});