// Credit to satansdeer: https://github.com/satansdeer/raycaster
// Modified by cheezos: https://github.com/cheezos/raycaster-js

const PIXI = require("pixi.js");
const CANVAS = document.getElementById("game-window");

const CELL_SIZE = 64;
const PLAYER_SIZE = CELL_SIZE / 10;
const FOV = toRadians(65);

const COLOURS = {
	MINIMAP: {
		WALL: 0xffffff,
		RAY: 0xff0000,
		PLAYER: 0x0000ff,
		PLAYER_DIRECTION: 0x000000,
	},
	WORLD: {
		WALL_LIGHT: 0x009ac9,
		WALL_DARK: 0x005a75,
		FLOOR: 0x222222,
		CEILING: 0x444444,
	},
};

const MAP = [
	[1, 1, 1, 1, 1, 1, 1],
	[1, 0, 0, 0, 1, 0, 1],
	[1, 0, 0, 0, 1, 0, 1],
	[1, 0, 0, 0, 0, 0, 1],
	[1, 1, 1, 0, 0, 0, 1],
	[1, 0, 0, 0, 1, 0, 1],
	[1, 1, 1, 1, 1, 1, 1],
];

// Player data.
const player = {
	x: CELL_SIZE * 1.5,
	y: CELL_SIZE * 2,
	angle: toRadians(0),
	speed: 0,
};

// Scale sprites to nearest pixel.
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

// Create the game canvas.
const app = new PIXI.Application({
	width: window.innerWidth,
	height: window.innerHeight,
	backgroundColor: 0x6b4b3d,
	// resolution: window.devicePixelRatio || 1,
	view: CANVAS,
});

// app.stage.interactive = true;

// Create a scene to add objects to.
let scene = new PIXI.Container();
app.stage.addChild(scene);

// Draws a rectangle on the screen.
const drawRect = (x, y, width, height, colour) => {
	const rect = new PIXI.Graphics();
	rect.beginFill(colour);
	rect.drawRect(x, y, width, height);
	scene.addChild(rect);
};

// Draws a line on the screen.
const drawLine = (startX, startY, endX, endY, colour) => {
	const line = new PIXI.Graphics();
	line.moveTo(startX, startY);
	line.lineStyle(1, colour);
	line.lineTo(endX, endY);
	scene.addChild(line);
};

// Converts degrees to radians.
function toRadians(deg) {
	return (deg * Math.PI) / 180;
}

// Returns if the given position is out of bounds.
function isOutOfBounds(x, y) {
	return x < 0 || x >= MAP[0].length || y < 0 || y >= MAP.length;
}

// Returns the distance between two positions
function distance(x1, y1, x2, y2) {
	return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Fixes distortion.
function fixFishEye(distance, angle, playerAngle) {
	const diff = angle - playerAngle;
	return distance * Math.cos(diff);
}

// Returns vertical collision data.
function getVCollision(angle) {
	const right = Math.abs(Math.floor((angle - Math.PI / 2) / Math.PI) % 2);
	const firstX = right
		? Math.floor(player.x / CELL_SIZE) * CELL_SIZE + CELL_SIZE
		: Math.floor(player.x / CELL_SIZE) * CELL_SIZE;
	const firstY = player.y + (firstX - player.x) * Math.tan(angle);
	const xA = right ? CELL_SIZE : -CELL_SIZE;
	const yA = xA * Math.tan(angle);
	let wall;
	let nextX = firstX;
	let nextY = firstY;

	while (!wall) {
		const cellX = right
			? Math.floor(nextX / CELL_SIZE)
			: Math.floor(nextX / CELL_SIZE) - 1;
		const cellY = Math.floor(nextY / CELL_SIZE);

		if (isOutOfBounds(cellX, cellY)) {
			break;
		}

		wall = MAP[cellY][cellX];

		if (!wall) {
			nextX += xA;
			nextY += yA;
		}
	}
	return {
		angle,
		distance: distance(player.x, player.y, nextX, nextY),
		vertical: true,
	};
}

// Returns horizontal collision data.
function getHCollision(angle) {
	const up = Math.abs(Math.floor(angle / Math.PI) % 2);
	const firstY = up
		? Math.floor(player.y / CELL_SIZE) * CELL_SIZE
		: Math.floor(player.y / CELL_SIZE) * CELL_SIZE + CELL_SIZE;
	const firstX = player.x + (firstY - player.y) / Math.tan(angle);
	const yA = up ? -CELL_SIZE : CELL_SIZE;
	const xA = yA / Math.tan(angle);
	let wall;
	let nextX = firstX;
	let nextY = firstY;

	while (!wall) {
		const cellX = Math.floor(nextX / CELL_SIZE);
		const cellY = up
			? Math.floor(nextY / CELL_SIZE) - 1
			: Math.floor(nextY / CELL_SIZE);

		if (isOutOfBounds(cellX, cellY)) {
			break;
		}

		wall = MAP[cellY][cellX];

		if (!wall) {
			nextX += xA;
			nextY += yA;
		}
	}
	return {
		angle,
		distance: distance(player.x, player.y, nextX, nextY),
		vertical: false,
	};
}

// Casts out a ray.
function castRay(angle) {
	const vCollision = getVCollision(angle);
	const hCollision = getHCollision(angle);

	return hCollision.distance >= vCollision.distance ? vCollision : hCollision;
}

// Returns a list of rays.
function getRays() {
	const initialAngle = player.angle - FOV / 2;
	const numberOfRays = 1280;
	const angleStep = FOV / numberOfRays;

	return Array.from({ length: numberOfRays }, (_, i) => {
		const angle = initialAngle + i * angleStep;
		const ray = castRay(angle);
		return ray;
	});
}

// Clear the scene.
function clearScene() {
	app.stage.removeChild(scene);
	scene.destroy();
	scene = new PIXI.Container();
	app.stage.addChild(scene);
}

// Handle player movement.
function handlePlayer() {
	player.x += Math.cos(player.angle) * player.speed;
	player.y += Math.sin(player.angle) * player.speed;
}

// Render the 3D scene.
function renderScene(rays) {
	rays.forEach((ray, i) => {
		const distance = fixFishEye(ray.distance, ray.angle, player.angle);
		const wallHeight = ((CELL_SIZE * 5) / distance) * 200;
		const wallColour = ray.vertical
			? COLOURS.WORLD.WALL_LIGHT
			: COLOURS.WORLD.WALL_DARK;
		// Draw wall.
		drawRect(
			i,
			window.innerHeight / 2 - wallHeight / 2,
			1,
			wallHeight,
			wallColour,
		);
		// Draw floor.
		drawRect(
			i,
			window.innerHeight / 2 + wallHeight / 2,
			1,
			window.innerHeight / 2 - wallHeight / 2,
			COLOURS.WORLD.FLOOR,
		);
		// Draw ceiling
		drawRect(
			i,
			0,
			1,
			window.innerHeight / 2 - wallHeight / 2,
			COLOURS.WORLD.CEILING,
		);
	});
}

// Render minimap.
function renderMinimap(posX, posY, scale, rays) {
	// Draw minimap cells.
	const cellSize = scale * CELL_SIZE;
	MAP.forEach((row, y) => {
		row.forEach((cell, x) => {
			if (cell) {
				drawRect(
					posX + x * cellSize,
					posY + y * cellSize,
					cellSize,
					cellSize,
					COLOURS.MINIMAP.WALL,
				);
			}
		});
	});

	// Draw rays.
	rays.forEach((ray) => {
		drawLine(
			posX + player.x * scale,
			posY + player.y * scale,
			(player.x + Math.cos(ray.angle) * ray.distance) * scale,
			(player.y + Math.sin(ray.angle) * ray.distance) * scale,
			COLOURS.MINIMAP.RAY,
		);
	});

	// Draw player.
	drawRect(
		posX + player.x * scale - PLAYER_SIZE / 2,
		posY + player.y * scale - PLAYER_SIZE / 2,
		PLAYER_SIZE,
		PLAYER_SIZE,
		COLOURS.MINIMAP.PLAYER,
	);

	// Draw player direction.
	const rayLength = PLAYER_SIZE * 7;
	drawLine(
		posX + player.x * scale,
		posY + player.y * scale,
		(player.x + Math.cos(player.angle) * rayLength) * scale,
		(player.y + Math.sin(player.angle) * rayLength) * scale,
		COLOURS.MINIMAP.PLAYER_DIRECTION,
	);
}

// Game loop
app.ticker.add(() => {
	clearScene();
	handlePlayer();
	const rays = getRays();
	renderScene(rays);
	renderMinimap(0, 0, 0.25, rays);
});

// Events
document.addEventListener("keydown", (e) => {
	if (e.key === "w") {
		player.speed = 2;
	}

	if (e.key === "s") {
		player.speed = -2;
	}
});

document.addEventListener("keyup", (e) => {
	if (e.key === "w" || e.key === "s") {
		player.speed = 0;
	}
});

document.addEventListener("mousemove", (e) => {
	player.angle += toRadians(e.movementX);
});
