var goldIm = new Image();
goldIm.src = "images/gold.png";
var smallGoldIm = new Image();
smallGoldIm.src = "images/small_gold.png";
var bigGoldIm = new Image();
bigGoldIm.src = "images/big_gold.png";
var rockIm = new Image();
rockIm.src = "images/rock.png";
var diamondIM = new Image();
diamondIM.src = "images/diamond.png";

function getScaledSpriteSize(image, maxDimension, fallbackRatio) {
    const ratio = fallbackRatio && fallbackRatio > 0 ? fallbackRatio : 1;
    const naturalWidth = image.naturalWidth || image.width || maxDimension * ratio;
    const naturalHeight = image.naturalHeight || image.height || maxDimension / ratio;
    const scale = maxDimension / Math.max(naturalWidth, naturalHeight);

    return {
        width: naturalWidth * scale,
        height: naturalHeight * scale,
    };
}

class gold {
    constructor(game, type, instanceId) {
        this.game = game;
        this.fixedType = typeof type === "number" ? type : null;
        this.instanceId = instanceId || "";
        this.init();
    }

    init() {
        this.type = this.fixedType !== null ? this.fixedType : Math.floor(Math.random() * 100000) % 8;
        this.x = 2 * this.game.getWidth() + Math.random() * (game_W - 4 * this.game.getWidth());
        this.y = 2 * this.game.getWidth() + game_H / 3 + Math.random() * (2 * game_H / 3 - 4 * this.game.getWidth());
        this.alive = true;
        this.update();
    }

    applyImageSize(maxDimension, fallbackRatio) {
        const size = getScaledSpriteSize(this.IM, maxDimension, fallbackRatio);
        this.width = size.width;
        this.height = size.height;
    }

    update() {
        switch (this.type) {
            case 0:
                this.speed = this.game.getWidth() / 5;
                this.IM = smallGoldIm;
                this.itemType = "small_gold";
                this.score = 50;
                this.applyImageSize(this.game.getWidth(), 1);
                break;
            case 1:
                this.speed = this.game.getWidth() / 8;
                this.IM = goldIm;
                this.itemType = "small_gold";
                this.score = 100;
                this.applyImageSize(1.5 * this.game.getWidth(), 256 / 122);
                break;
            case 2:
                this.speed = this.game.getWidth() / 20;
                this.IM = bigGoldIm;
                this.itemType = "big_gold";
                this.score = 250;
                this.applyImageSize(2.5 * this.game.getWidth(), 1);
                break;
            case 3:
                this.speed = this.game.getWidth() / 15;
                this.IM = rockIm;
                this.itemType = "rock";
                this.score = 11;
                this.applyImageSize(1.5 * this.game.getWidth(), 1);
                break;
            case 4:
                this.speed = this.game.getWidth() / 40;
                this.IM = rockIm;
                this.itemType = "rock";
                this.score = 20;
                this.applyImageSize(1.8 * this.game.getWidth(), 1);
                break;
            case 5:
                this.speed = this.game.getWidth() / 65;
                this.IM = rockIm;
                this.itemType = "rock";
                this.score = 30;
                this.applyImageSize(2 * this.game.getWidth(), 1);
                break;
            case 6:
            case 7:
                this.speed = this.game.getWidth() / 2.5;
                this.IM = diamondIM;
                this.itemType = "diamond";
                this.score = 600;
                this.applyImageSize(this.game.getWidth() / 2, 512 / 416);
                break;
        }
    }

    randomXY() {
        this.x = 2 * this.game.getWidth() + Math.random() * (game_W - 4 * this.game.getWidth());
        this.y = 2 * this.game.getWidth() + game_H / 3 + Math.random() * (2 * game_H / 3 - 4 * this.game.getWidth());
    }

    draw() {
        this.game.context.drawImage(this.IM, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    }

    size() {
        return Math.sqrt(this.width * this.width + this.height * this.height) / 2;
    }
}
