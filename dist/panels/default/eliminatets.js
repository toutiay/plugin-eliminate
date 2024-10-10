"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.filePath2DbPath = exports.normalizePath = void 0;
const fs_extra_1 = require("fs-extra");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const path_2 = require("path");
const vue_1 = require("vue");
const weakMap = new WeakMap();
const checkedExtPath = normalizePath(`${Editor.Project.path}\\assets\\NoUi3\\ext`);
const backupExtPath = normalizePath(`${__dirname}\\..\\..\\..\\ext`);
class ExtData {
}
/**
 * 规范化文件路径
 * @param filePath 需要规范化的文件路径
 * @returns 规范化后的文件路径
 */
function normalizePath(filePath) {
    return path_1.default.normalize(filePath).replace(/\\/g, '/');
}
exports.normalizePath = normalizePath;
function filePath2DbPath(path) {
    return normalizePath(path).replace(normalizePath(Editor.Project.path), 'db:/');
}
exports.filePath2DbPath = filePath2DbPath;
async function moveFile(item) {
    let fromPath = `${item.checked ? backupExtPath : checkedExtPath}`;
    let toPath = `${item.checked ? checkedExtPath : backupExtPath}`;
    fromPath = path_1.default.join(fromPath, item.label);
    toPath = path_1.default.join(toPath, item.label);
    console.log(`fromPath>>>${fromPath}`);
    console.log(`toPath>>>${toPath}`);
    try {
        if ((0, fs_extra_1.existsSync)(fromPath)) {
            (0, fs_extra_1.copySync)(fromPath, toPath, { overwrite: true });
        }
        if ((0, fs_extra_1.existsSync)(`${fromPath}.meta`)) {
            (0, fs_extra_1.copySync)(`${fromPath}.meta`, `${toPath}.meta`, { overwrite: true });
        }
    }
    catch (error) {
        console.error(error);
    }
    let dbfromPath = filePath2DbPath(fromPath);
    let dbtoPath = filePath2DbPath(toPath);
    console.log(`dbfromPath>>>${dbfromPath}`);
    console.log(`dbtoPath>>>${dbtoPath}`);
    //  导入文件
    if (item.checked) {
        await Editor.Message.request("asset-db", "refresh-asset", dbtoPath);
    }
    else {
        // 删除文件
        await Editor.Message.request("asset-db", "delete-asset", dbfromPath);
        await Editor.Message.request("asset-db", "refresh-asset", dbfromPath);
    }
}
function getRootDirectoryContents(rootPath) {
    try {
        // 确保目录路径存在
        if (!fs_1.default.existsSync(rootPath)) {
            throw new Error('Directory does not exist');
        }
        // 读取目录内容
        const items = fs_1.default.readdirSync(rootPath);
        // 初始化结果对象
        const result = new Set;
        // 遍历目录内容
        items.forEach(item => {
            // const itemPath = path.join(rootPath, item);
            // const stat = fs.statSync(itemPath);
            if (path_1.default.extname(item) != ".meta") {
                result.add(item);
            }
        });
        return result;
    }
    catch (error) {
        console.error(`Error reading directory: ${error}`);
        throw error;
    }
}
module.exports = Editor.Panel.define({
    listeners: {
    // show() { console.log('show'); },
    // hide() { console.log('hide'); },
    },
    template: (0, fs_extra_1.readFileSync)((0, path_2.join)(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: (0, fs_extra_1.readFileSync)((0, path_2.join)(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        app: '#app'
    },
    methods: {
        setState(v) {
            console.log(v);
        }
    },
    ready() {
        if (this.$.app) {
            const app = (0, vue_1.createApp)({});
            app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ui-');
            app.component('my-info', {
                template: (0, fs_extra_1.readFileSync)((0, path_2.join)(__dirname, '../../../static/template/vue/eliminatets.html'), 'utf-8'),
                data() {
                    return {
                        listItems: [],
                    };
                },
                methods: {
                    onItemChecked(item) {
                        moveFile(item);
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
