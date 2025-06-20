const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const { loadInitClassCSV, loadAllClassCSV } = require("./dataLoader");
const fs = require("fs");
const Papa = require("papaparse");

// 🔽 使用者要編輯 csv 時自動打開對應路徑
ipcMain.handle("open-file", (event, filename) => {
	const filePath = path.join(app.getPath("userData"), filename);

	// 若檔案不存在則自動建立
	if (!fs.existsSync(filePath)) {
		fs.writeFileSync(filePath, "", "utf-8");
	}

	shell.openPath(filePath);
});

function createWindow() {
	const mainWindow = new BrowserWindow({
		width: 1920,
		height: 1080,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	mainWindow.maximize(); // 或改成 fullscreen: true 看需求
	mainWindow.loadFile("index.html");
	mainWindow.setMenu(null);
	// mainWindow.webContents.openDevTools(); // 若不需要可註解
}

// 註冊 IPC handler，前端用這兩個 key 取得不同 CSV 資料
ipcMain.handle("get-init-class", () => {
	return loadInitClassCSV();
});

ipcMain.handle("get-all-class", () => {
	return loadAllClassCSV();
});

// 當 Electron 準備好時呼叫一次 createWindow()
app.whenReady().then(() => {
	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

// 關閉時退出
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

// 🔽 供渲染端確認 CSV 狀態
ipcMain.handle("check-csv-status", async () => {
	const userDataPath = app.getPath("userData");
	const initPath = path.join(userDataPath, "init_class.csv");
	const allPath = path.join(userDataPath, "all_class.csv");

	let missing = false;
	let noData = false;

	if (!fs.existsSync(initPath) || !fs.existsSync(allPath)) {
		missing = true;
	} else {
		const content = fs.readFileSync(allPath, "utf8");
		const cleanContent = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
		const parsed = Papa.parse(cleanContent, {
			header: true,
			skipEmptyLines: true,
		});
		noData = parsed.data.length === 0 || parsed.errors.length > 0;
	}

	return { missing, noData };
});
