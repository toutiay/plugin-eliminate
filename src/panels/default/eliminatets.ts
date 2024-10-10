import { readFileSync, copySync, existsSync } from 'fs-extra';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { join, basename } from 'path';
import { createApp, App } from 'vue';
import { exec } from 'child_process';
const weakMap = new WeakMap<any, App>();
const checkedExtPath = normalizePath(`${Editor.Project.path}\\assets\\NoUi3\\ext`);
const backupExtPath = normalizePath(`${__dirname}\\..\\..\\..\\ext`);

class ExtData {
    id!: string;
    label!: string;
    checked!: boolean;
}

/**
 * 规范化文件路径
 * @param filePath 需要规范化的文件路径
 * @returns 规范化后的文件路径
 */
export function normalizePath(filePath: string): string {
    return path.normalize(filePath).replace(/\\/g, '/');
}

export function filePath2DbPath(path: string) {
    return normalizePath(path).replace(normalizePath(Editor.Project.path), 'db:/');
}

async function moveFile(item: ExtData) {
    let fromPath = `${item.checked ? backupExtPath : checkedExtPath}`;
    let toPath = `${item.checked ? checkedExtPath : backupExtPath}`;
    fromPath = path.join(fromPath, item.label);
    toPath = path.join(toPath, item.label);
    console.log(`fromPath>>>${fromPath}`);
    console.log(`toPath>>>${toPath}`);

    try {
        if (existsSync(fromPath)) {
            copySync(fromPath, toPath, { overwrite: true });
        }
        if (existsSync(`${fromPath}.meta`)) {
            copySync(`${fromPath}.meta`, `${toPath}.meta`, { overwrite: true });
        }
    } catch (error) {
        console.error(error);
    }
    let dbfromPath = filePath2DbPath(fromPath);
    let dbtoPath = filePath2DbPath(toPath);
    console.log(`dbfromPath>>>${dbfromPath}`);
    console.log(`dbtoPath>>>${dbtoPath}`);
    //  导入文件
    if (item.checked) {
        await Editor.Message.request("asset-db", "refresh-asset", dbtoPath);
    } else {
        // 删除文件
        await Editor.Message.request("asset-db", "delete-asset", dbfromPath);
        await Editor.Message.request("asset-db", "refresh-asset", dbfromPath);
    }
}

function getRootDirectoryContents(rootPath: string): Set<string> {
    try {
        // 确保目录路径存在
        if (!fs.existsSync(rootPath)) {
            throw new Error('Directory does not exist');
        }

        // 读取目录内容
        const items = fs.readdirSync(rootPath);

        // 初始化结果对象
        const result: Set<string> = new Set;

        // 遍历目录内容
        items.forEach(item => {
            // const itemPath = path.join(rootPath, item);
            // const stat = fs.statSync(itemPath);
            if (path.extname(item) != ".meta") {
                result.add(item);
            }
        });

        return result;
    } catch (error) {
        console.error(`Error reading directory: ${error}`);
        throw error;
    }
}

module.exports = Editor.Panel.define({
    listeners: {
        // show() { console.log('show'); },
        // hide() { console.log('hide'); },
    },
    template: readFileSync(join(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        app: '#app'
    },
    methods: {
        setState(v: string) {
            console.log(v);
        }
    },
    ready() {
        if (this.$.app) {
            const app = createApp({});
            app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ui-');
            app.component('my-info', {
                template: readFileSync(join(__dirname, '../../../static/template/vue/eliminatets.html'), 'utf-8'),
                data() {
                    return {
                        listItems: [],
                    };
                },
                methods: {
                    onItemChecked(item: ExtData) {
                        moveFile(item)
                    },
                    refresh() {
                        this.initializeListItems();
                    },
                    // 初始化列表项的方法
                    initializeListItems() {
                        console.log(checkedExtPath);
                        console.log(backupExtPath);
                        this.listItems = [];
                        let checkedList = getRootDirectoryContents(checkedExtPath);
                        let backupExtList = getRootDirectoryContents(backupExtPath);
                        let allList = new Set(Array.from(checkedList).concat(Array.from(backupExtList)));
                        allList.forEach((v) => {
                            this.listItems.push({
                                id: v,
                                label: v,
                                checked: checkedList.has(v),
                            });
                        });
                    }
                },
                mounted() {
                    this.initializeListItems();
                }
            });
            app.mount(this.$.app);
            weakMap.set(this, app);
        }
    },
    beforeClose() { },
    close() {
        const app = weakMap.get(this);
        if (app) {
            app.unmount();
        }
    },
});