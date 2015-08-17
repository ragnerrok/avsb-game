var FacingEnum = Object.freeze({
	FACING_LEFT: "Left",
	FACING_RIGHT: "Right"
});

var AnimationStateEnum = Object.freeze({
	ANIMATION_STATE_IDLE: "Idle",
	ANIMATION_STATE_MOVE: "Move",
	ANIMATION_STATE_JUMP: "Jump"
});

var MovementModifierEnum = Object.freeze({
	MOVEMENT_MODIFIER_NONE: "None",
	MOVEMENT_MODIFIER_RUN: "Run",
	MOVEMENT_MODIFIER_CROUCH: "Crouch"
});

var ActionEnum = Object.freeze({
	ACTION_NONE: "None",
	ACTION_PUNCH: "Punch",
	ACTION_KICK: "Kick",
	ACTION_BLOCK: "Block",
	ACTION_PROJECTILE: "Projectile"
});

var FrameSetEnum = Object.freeze({
	FRAME_SET_IDLE: "Idle",
	FRAME_SET_WALKING: "Walking",
	FRAME_SET_RUNNING: "Running",
	FRAME_SET_JUMPING: "Jumping",
	FRAME_SET_PUNCHING: "Punching",
	FRAME_SET_KICKING: "Kicking",
	FRAME_SET_BLOCKING: "Blocking",
	FRAME_SET_CROUCHING: "Crouching"
});

var UserInputEnum = Object.freeze({
	USER_INPUT_NONE: 0x0000,
	USER_INPUT_LEFT: 0x0001,
	USER_INPUT_RIGHT: 0x0002,
	USER_INPUT_JUMP: 0x0004,
	USER_INPUT_CROUCH: 0x0008,
	USER_INPUT_PUNCH: 0x0010,
	USER_INPUT_KICK: 0x0020,
	USER_INPUT_BLOCK: 0x0040,
	USER_INPUT_RUN: 0x0080
});

var BodyPartEnum = Object.freeze({
	BODY_PART_NONE: "None",
	BODY_PART_LEFT_LEG: "LeftLeg",
	BODY_PART_RIGHT_LEG: "RightLeg",
	BODY_PART_LEFT_ARM: "LeftArm",
	BODY_PART_RIGHT_ARM: "RightArm",
	BODY_PART_BODY: "Body",
	BODY_PART_HEAD: "Head"
});

var FPS = 15;
var FPS_DECIMATION_LIMIT = 2;
var NUM_FRAMES_PER_STATE = 15;
var FRAME_TIME = 1000 / FPS;
var DEFAULT_MOVEMENT_SPEED = 200;
var DEFAULT_RUN_MODIFIER = 2;
var DEFAULT_CROUCH_MODIFIER = 0.5;
var DEFAULT_JUMP_POWER = 750;
var GRAVITY_ACCELERATION = 1000;
var FRAME_SIZE_SCALE_FACTOR = 0.75;
var DEFAULT_ACTION_NUM_FRAMES = {"Punch": 5, "Kick": 7, "Block": 1};
// Convenience input bitmasks
var USER_INPUT_MOVING_LEFT_RIGHT = (UserInputEnum.USER_INPUT_LEFT | UserInputEnum.USER_INPUT_RIGHT);

var gblEngine = null;

function init_game()
{
	gblEngine = new Engine(document);
}

function Engine(mainPage)
{
	// Initialize drawing context
	this.canvas = mainPage.getElementById("main-canvas");
	this.ctx = this.canvas.getContext("2d");
	this.mainPage = mainPage;
	
	// Add keyboard listeners
	mainPage.addEventListener('keydown', this.keydownHandler.bind(this));
	mainPage.addEventListener('keyup', this.keyupHandler.bind(this));
	
	// Initialize engine controls map
	this.controlsMap = [];
	this.controlsMap[KEY_LEFT.toString()] = UserInputEnum.USER_INPUT_LEFT;
	this.controlsMap[KEY_RIGHT.toString()] = UserInputEnum.USER_INPUT_RIGHT;
	this.controlsMap[KEY_UP.toString()] = UserInputEnum.USER_INPUT_JUMP;
	this.controlsMap[KEY_DOWN.toString()] = UserInputEnum.USER_INPUT_CROUCH;
	this.controlsMap[KEY_Z.toString()] = UserInputEnum.USER_INPUT_PUNCH;
	this.controlsMap[KEY_X.toString()] = UserInputEnum.USER_INPUT_KICK;
	this.controlsMap[KEY_C.toString()] = UserInputEnum.USER_INPUT_BLOCK;
	this.controlsMap[KEY_CTRL.toString()] = UserInputEnum.USER_INPUT_RUN;
	
	// Initialize global engine variables
	this.lastFrameTime = 0;
	this.frameDuration = 0;
	this.fps = 0;
	this.fpsDecimationCounter = 0;
	this.currentInput = UserInputEnum.USER_INPUT_NONE;
	this.fighter1 = null;
	this.fighter2 = null;
	this.numFightersLoaded = 0;
	
	this.fighter1 = new PlayerFighter(this, "Aaron-Frame-1", new Point(0, this.canvas.height), "../src/fighter_aaron.json");
	this.fighter1.onFighterLoaded = this.onFighterLoaded.bind(this);
	this.fighter2 = new AIFighter(this, "Aaron-Frame-1", new Point(550, this.canvas.height), "../src/fighter_aaron.json");
	this.fighter2.onFighterLoaded = this.onFighterLoaded.bind(this);
	
	// Set up stage
	this.drawStageBounds();
	
	// Load fighters.  The animation loop will start when all fighters are loaded
	this.fighter1.loadFighter();
	this.fighter2.loadFighter();
}

Engine.prototype.onFighterLoaded = function() {
	console.log("Fighter Loaded");
	this.numFightersLoaded++;
	console.log(this.numFightersLoaded);
	if (this.numFightersLoaded >= 2) {
		// Start animation loop
		console.log("Starting animation loop");
		requestAnimationFrame(this.renderFrame.bind(this));
	}
}

Engine.prototype.keydownHandler = function(event) {
	if (this.controlsMap[event.keyCode.toString()]) {
		this.currentInput |= this.controlsMap[event.keyCode.toString()];
	}
};

Engine.prototype.keyupHandler = function(event) {
	if (this.controlsMap[event.keyCode.toString()]) {
		this.currentInput &= ~this.controlsMap[event.keyCode.toString()];
	}
};

Engine.prototype.drawStageBounds = function() {
	this.ctx.strokeStyle = "black";
	this.ctx.lineWidth = "1";
	this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
};

Engine.prototype.renderFrame = function(globalTime) {
	this.frameDuration = globalTime - this.lastFrameTime;
	this.lastFrameTime = globalTime;
	if (this.fpsDecimationCounter++ >= FPS_DECIMATION_LIMIT) {
		this.fps = 1.0 / (this.frameDuration / 1000.0);
		this.fpsDecimationCounter = 0;
	}
	
	// Clear the canvas
	this.ctx.clearRect(1, 1, this.canvas.width - 2, this.canvas.height - 2);
	
	// Draw the fps meter in the top left corner
	this.ctx.save();
	this.ctx.font = "18px sans-serif"
	this.ctx.fillStyle = 'black'
	this.ctx.fillText("FPS: " + this.fps.toFixed(2), 10, 30);
	this.ctx.restore();
	
	// Check fighter collisions
	checkCollisions(this.fighter1, this.fighter2);
	
	this.fighter1.update(this.frameDuration);
	this.fighter1.draw(this.fighter1.currentFrame);
	
	this.fighter2.update(this.frameDuration);
	this.fighter2.draw(this.fighter2.currentFrame);
	
	// Render each individual fighter canvas into the main canvas
	this.ctx.drawImage(this.fighter1.subCanvas, this.fighter1.location.x, this.fighter1.location.y - this.fighter1.framesNew[this.fighter1.currentFrameSet][this.fighter1.currentFrame].height);
	this.ctx.drawImage(this.fighter2.subCanvas, this.fighter2.location.x, this.fighter2.location.y - this.fighter2.framesNew[this.fighter1.currentFrameSet][this.fighter1.currentFrame].height);
	
	requestAnimationFrame(this.renderFrame.bind(this));
};
