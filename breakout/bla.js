var scoreText = document.getElementById('score');
var canvas = document.getElementById('surface');
var ctx = canvas.getContext('2d');
var screenHeight = ctx.canvas.height;
var screenWidth = ctx.canvas.width;

var requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback, element) {
            window.setTimeout(callback, 1000 / 60);
        };
}());

var Timer = {
    time: null,
    gameTime: 0,
    maxStep: 0.05,
    wallLastTimestamp: 0,

    tick: function () {
        var wallCurrent, wallDelta, gameDelta;
        wallCurrent = Date.now();
        wallDelta = (wallCurrent - this.wallLastTimestamp) / 1000;
        this.wallLastTimestamp = wallCurrent;

        gameDelta = Math.min(wallDelta, this.maxStep);
        this.gameTime += gameDelta;
        return gameDelta;
    }
};

var Input = {
    mouse: null,
    click: null,
    getXandY: function (e) {
        var x, y;
        x = e.clientX - ctx.canvas.getBoundingClientRect().left;
        y = e.clientY - ctx.canvas.getBoundingClientRect().top;
        return {x: x, y: y};
    }
};

window.addEventListener("click", function (e) {
    Input.click = Input.getXandY(e);
}, false);

window.addEventListener("mousemove", function (e) {
    Input.mouse = Input.getXandY(e);
}, false);

function Entity() {
    this.removeFromWorld = false;
}

// --------------------------------------------------------------------------
function Paddle() {
    this.x = screenWidth / 2 - 40;
    this.y = screenHeight - 24;
    this.width = 80;
    this.height = 16;
    this.color = '#222';
    this.borderColor = '#555';
}

Paddle.prototype = new Entity();
Paddle.prototype.constructor = Paddle;

Paddle.prototype.draw = function () {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeStyle = this.borderColor;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
};

Paddle.prototype.update = function () {
    if (Input.mouse) {
        this.x = Input.mouse.x - this.width / 2;
    }
    if (this.x < 0) {
        this.x = 0;
    }
    if (this.x + this.width > screenWidth) {
        this.x = screenWidth - this.width;
    }
};

// --------------------------------------------------------------------------
function Block(px, py, pwidth, pheight, pcolor) {
    this.x = px;
    this.y = py;
    this.width = pwidth;
    this.height = pheight;
    this.color = pcolor;
}

Block.prototype = new Entity();
Block.prototype.constructor = Block;

Block.prototype.draw = function () {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
};

Block.prototype.update = function () {
};

// --------------------------------------------------------------------------
function Ball() {
    this.x = screenWidth / 2;
    this.y = screenHeight - 29;
    this.radius = 5;
    this.speed = 0;
    this.startSpeed = 300;
    this.vx = 0.001;
    this.vy = -0.999;
    this.color = '#fff';
}

Ball.prototype = new Entity();
Ball.prototype.constructor = Ball;

Ball.prototype.draw = function () {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
};

Ball.prototype.checkCollision = function (entity) {
    return (
        this.x + this.radius > entity.x &&
            this.x - this.radius < entity.x + entity.width &&
            this.y + this.radius > entity.y &&
            this.y - this.radius < entity.y + entity.height
        );
};

Ball.prototype.paddleBounce = function (paddle) {
    this.vx = (((paddle.x + paddle.width / 2) - this.x) * -0.025) * 0.6 + 0.2;
    this.vy = -1 + Math.abs(this.vx);
};

Ball.prototype.blockBounce = function (block) {

    function getDistance(ball, x, y) {
        var dx, dy;
        dx = Math.abs(ball.x - x);
        dy = Math.abs(ball.y - y);
        return Math.sqrt(dx * dx + dy * dy);
    }

    function getShortest(ball, x1, y1, x2, y2) {
        var cx, cy, dx, dy, u; //c:closest d:delta
        dx = Math.abs(x2 - x1);
        dy = Math.abs(y2 - y1);
        u = ((ball.x - x1) * dx + (ball.y - y1) * dy) / (dx * dx + dy * dy);
        if (u < 0) {
            cx = x1;
            cy = y1;
        } else if (u > 1) {
            cx = x2;
            cy = y2;
        } else {
            cx = x1 + u * dx;
            cy = y1 + u * dy;
        }
        return getDistance(ball, cx, cy);
    }

    var L, R, T, B, M; //left,right,top,bottom,min
    L = getShortest(this, block.x, block.y, block.x, block.y + block.height);
    R = getShortest(this, block.x + block.width, block.y, block.x + block.width, block.y + block.height);
    T = getShortest(this, block.x, block.y, block.x + block.width, block.y);
    B = getShortest(this, block.x, block.y + block.height, block.x + block.width, block.y + block.height);
    M = Math.min(L, R, T, B);
    if (M === L || M === R) {
        this.vx *= -1;
    } else {
        this.vy *= -1;
    }
};

Ball.prototype.update = function (game) {
    var i, entity;

    if (this.speed === 0) {
        if (Input.mouse) {
            this.x = Input.mouse.x;
        }
        if (Input.click) {
            this.speed = this.startSpeed;
        }
    }
    for (i = 0; i < game.entities.length; i += 1) {
        entity = game.entities[i];
        if (this.checkCollision(entity)) {
            if (entity instanceof Paddle) {
                this.paddleBounce(entity);
            }
            if (entity instanceof Block) {
                game.changeScore();
                entity.removeFromWorld = true;
                this.blockBounce(entity);
            }
        }
    }

    if (this.x === this.radius || this.x === screenWidth - this.radius) {
        this.vx *= -1;
    } else if (this.y === this.radius) {
        this.vy *= -1;
    } else if (this.y === screenHeight - this.radius) {
        this.removeFromWorld = true;
        game.addEntity(new Ball());
    }

    this.x += this.vx * this.speed * Timer.time;
    this.y += this.vy * this.speed * Timer.time;
    if (this.x < this.radius) {
        this.x = this.radius;
    }
    if (this.x > screenWidth - this.radius) {
        this.x = screenWidth - this.radius;
    }
    if (this.y < this.radius) {
        this.y = this.radius;
    }
    if (this.y > screenHeight - this.radius) {
        this.y = screenHeight - this.radius;
    }
};

// --------------------------------------------------------------------------
function GameEngine() {
    this.entities = [];
    this.score = 0;
    this.scoreChanged = true;
}

GameEngine.prototype.init = function () {
    var i, j, color;
    this.paddle = new Paddle();
    this.ball = new Ball();
    this.addEntity(this.paddle);
    this.addEntity(this.ball);
    for (j = 0; j < 10; j += 1) {
        for (i = 0; i < 10; i += 1) {
            color = '#' + (Math.random() * 0x404040 + 0xaaaaaa | 0).toString(16);
            this.block = new Block(i * 60 + 23, j * 26 + 23, 54, 20, color); // Block(x, y , width, height, color)
            this.addEntity(this.block);
        }
    }
};

GameEngine.prototype.start = function () {
    var that = this;
    (function gameLoop() {
        that.loop();
        requestAnimFrame(gameLoop);
    }());
};

GameEngine.prototype.addEntity = function (entity) {
    this.entities.push(entity);
};

GameEngine.prototype.draw = function () {
    var i;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, screenWidth, screenHeight);
    for (i = this.entities.length - 1; i >= 0; i -= 1) {
        this.entities[i].draw();
    }
};

GameEngine.prototype.changeScore = function () {
    this.scoreChanged = true;
    this.score += 100;
};

GameEngine.prototype.update = function () {
    var i, entitiesCount, entity;
    entitiesCount = this.entities.length;
    for (i = 0; i < entitiesCount; i += 1) {
        entity = this.entities[i];
        if (!entity.removeFromWorld) {
            entity.update(this);
        }
    }
    for (i = this.entities.length - 1; i >= 0; i -= 1) {
        if (this.entities[i].removeFromWorld) {
            this.entities.splice(i, 1);
        }
    }
    if (this.scoreChanged) {
        this.scoreChanged = false;
        scoreText.innerHTML = 'Score: ' + Math.round(this.score);
    }
};

GameEngine.prototype.loop = function () {
    Timer.time = Timer.tick();
    this.update();
    this.draw();
    Input.click = null;
};

var test = new GameEngine();
test.init();
test.start();