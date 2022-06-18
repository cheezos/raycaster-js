const { app, BrowserWindow } = require("electron");

const SCREEN_WIDTH = 1280;
const SCREEN_HEIGHT = 720;

const createWindow = () => {
	const win = new BrowserWindow({
		width: SCREEN_WIDTH,
		height: SCREEN_HEIGHT,
		webPreferences: {
			contextIsolation: false,
			nodeIntegration: true,
			preload: __dirname + "/preload.js",
		},
		show: false,
		resizable: false,
		autoHideMenuBar: true,
	});

	win.loadFile("index.html");
	// win.webContents.openDevTools();

	win.on("ready-to-show", () => {
		win.show();
	});
};

app.on("ready", () => {
	createWindow();
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
