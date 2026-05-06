// ── Image Assets ──────────────────────────────────────────────────────────────
var bigGoldIm = new Image();
bigGoldIm.src = "images/big_gold.png";

var goldIm = new Image();
goldIm.src = "images/gold.png";

var mediumGoldIm = new Image();
mediumGoldIm.src = "images/medium_gold.png";

var rockIm = new Image();
rockIm.src = "images/rock.png";

var diamondIm = new Image();
diamondIm.src = "images/diamond.png";

var blueJewelryIm = new Image();
blueJewelryIm.src = "images/blue_jewelry.png";

var pinkJewelryIm = new Image();
pinkJewelryIm.src = "images/pink_jewelry.png";

var heartJewelryIm = new Image();
heartJewelryIm.src = "images/heart_jewelry.png";

var moneyIm = new Image();
moneyIm.src = "images/money.png";

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Gold / Item class ─────────────────────────────────────────────────────────
//
//  ITEM_TYPE_PLAN in game.js maps to these types (9 unique items, 15 total per level):
//   0  = rock          (15 pts,  fast)            → rock      (recognition)
//   1  = rock          (25 pts,  medium)          → rock      (recognition)
//   2  = rock          (35 pts,  slow)            → rock      (recognition)
//   3  = medium_gold   (150 pts, medium)          → medium_gold (comprehension)
//   4  = medium_gold   (200 pts, medium)          → medium_gold (comprehension)
//   5  = big_gold      (300 pts, slow)            → big_gold  (application_basic)
//   6  = gold          (400 pts, very slow)       → big_gold  (application_basic)
//   7  = gold          (500 pts, very slow)       → big_gold  (application_basic)
//   8  = money         (450 pts, slow)            → big_gold  (application_basic)
//   9  = diamond       (700 pts, fast)            → diamond   (application_advanced)
//  10  = blue_jewelry  (280 pts, medium)          → diamond   (application_advanced)
//  11  = pink_jewelry  (260 pts, medium)          → diamond   (application_advanced)
//  12  = heart_jewelry (240 pts, medium)          → diamond   (application_advanced)
//  13  = diamond       (600 pts, fast)            → diamond   (application_advanced)
//  14  = blue_jewelry  (320 pts, medium)          → diamond   (application_advanced)
//
//  Distribution per level (15 items):
//   - rock: 3 items (types 0, 1, 2)
//   - medium_gold: 2 items (types 3, 4)
//   - big_gold: 3 items (types 5, 6, 7)
//   - diamond: 7 items (types 8, 9, 10, 11, 12, 13, 14)
//
//  Item type to difficulty mapping:
//   - rock → recognition
//   - medium_gold → comprehension
//   - big_gold → application_basic
//   - diamond → application_advanced
//
class gold {
    constructor(game, type, instanceId) {
        this.game = game;
        this.fixedType = typeof type === "number" ? type : null;
        this.instanceId = instanceId || "";
        this.init();
    }

    init() {
        this.type = this.fixedType !== null ? this.fixedType : Math.floor(Math.random() * 100000) % 15;
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
        const W = this.game.getWidth();
        switch (this.type) {
            // ── rock (recognition) ──────────────────────────────────────────
            case 0: // rock small
                this.speed   = W / 6;
                this.IM      = rockIm;
                this.itemType = "rock";
                this.score   = 15;
                this.applyImageSize(W * 1.5, 1);
                break;
            case 1: // rock medium
                this.speed   = W / 15;
                this.IM      = rockIm;
                this.itemType = "rock";
                this.score   = 25;
                this.applyImageSize(W * 2.2, 1);
                break;
            case 2: // rock large
                this.speed   = W / 30;
                this.IM      = rockIm;
                this.itemType = "rock";
                this.score   = 35;
                this.applyImageSize(W * 2.8, 1);
                break;

            // ── medium_gold (comprehension) ─────────────────────────────────
            case 3: // medium gold small
                this.speed   = W / 10;
                this.IM      = mediumGoldIm;
                this.itemType = "medium_gold";
                this.score   = 150;
                this.applyImageSize(W * 2.0, 1);
                break;
            case 4: // medium gold large
                this.speed   = W / 18;
                this.IM      = mediumGoldIm;
                this.itemType = "medium_gold";
                this.score   = 200;
                this.applyImageSize(W * 2.8, 1);
                break;

            // ── big_gold (application_basic) ─────────────────────────────────
            case 5: // big gold
                this.speed   = W / 25;
                this.IM      = bigGoldIm;
                this.itemType = "big_gold";
                this.score   = 300;
                this.applyImageSize(W * 3.0, 1);
                break;
            case 6: // gold
                this.speed   = W / 35;
                this.IM      = goldIm;
                this.itemType = "big_gold";
                this.score   = 400;
                this.applyImageSize(W * 2.5, 1);
                break;
            case 7: // gold ingot
                this.speed   = W / 40;
                this.IM      = goldIm;
                this.itemType = "big_gold";
                this.score   = 500;
                this.applyImageSize(W * 3.2, 1);
                break;
            case 8: // money bag
                this.speed   = W / 30;
                this.IM      = moneyIm;
                this.itemType = "big_gold";
                this.score   = 450;
                this.applyImageSize(W * 2.5, 1);
                break;

            // ── diamond (application_advanced) ─────────────────────────────
            case 9: // diamond
                this.speed   = W / 3;
                this.IM      = diamondIm;
                this.itemType = "diamond";
                this.score   = 700;
                this.applyImageSize(W * 1.3, 1);
                break;
            case 10: // blue jewelry
                this.speed   = W / 8;
                this.IM      = blueJewelryIm;
                this.itemType = "diamond";
                this.score   = 280;
                this.applyImageSize(W * 1.8, 1);
                break;
            case 11: // pink jewelry
                this.speed   = W / 8;
                this.IM      = pinkJewelryIm;
                this.itemType = "diamond";
                this.score   = 260;
                this.applyImageSize(W * 1.8, 1);
                break;
            case 12: // heart jewelry
                this.speed   = W / 8;
                this.IM      = heartJewelryIm;
                this.itemType = "diamond";
                this.score   = 240;
                this.applyImageSize(W * 1.8, 1);
                break;
            case 13: // diamond small
                this.speed   = W / 4;
                this.IM      = diamondIm;
                this.itemType = "diamond";
                this.score   = 600;
                this.applyImageSize(W * 1.6, 1);
                break;
            case 14: // blue jewelry 2
                this.speed   = W / 10;
                this.IM      = blueJewelryIm;
                this.itemType = "diamond";
                this.score   = 320;
                this.applyImageSize(W * 2.0, 1);
                break;
        }
    }

    randomXY() {
        const unit = this.game.getWidth();
        const minX = 2 * unit;
        const maxX = Math.max(minX, game_W - 2 * unit);
        const minY = 2 * unit + game_H / 3;
        const maxY = Math.max(minY, game_H - 2 * unit);
        this.x = minX + Math.random() * Math.max(maxX - minX, 1);
        this.y = minY + Math.random() * Math.max(maxY - minY, 1);
    }

    draw() {
        if (this.game && typeof this.game.drawImageSafe === "function") {
            this.game.drawImageSafe(this.IM, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
            return;
        }

        this.game.context.drawImage(this.IM, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    }

    size() {
        return Math.sqrt(this.width * this.width + this.height * this.height) / 2;
    }
}
