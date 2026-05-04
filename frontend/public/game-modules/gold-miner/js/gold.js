// ── Image Assets ──────────────────────────────────────────────────────────────
var tinyGoldIm = new Image();
tinyGoldIm.src = "images/tiny_gold.png";

var smallGoldIm = new Image();
smallGoldIm.src = "images/small_gold.png";

var mediumGoldIm = new Image();
mediumGoldIm.src = "images/medium_gold.png";

var bigGoldIm = new Image();
bigGoldIm.src = "images/big_gold.png";

var goldIngotIm = new Image();
goldIngotIm.src = "images/gold_ingot.png";

var rockIm = new Image();
rockIm.src = "images/rock.png";

var diamondIM = new Image();
diamondIM.src = "images/kim_cuong.png";

var blueJewelryIm = new Image();
blueJewelryIm.src = "images/blue_jewelry.png";

var pinkJewelryIm = new Image();
pinkJewelryIm.src = "images/pink_jewelry.png";

var heartJewelryIm = new Image();
heartJewelryIm.src = "images/heart_jewelry.png";

var moneyIm = new Image();
moneyIm.src = "images/money.png";

var mysteryBagIm = new Image();
mysteryBagIm.src = "images/mystery_bag.png";

var magnetIm = new Image();
magnetIm.src = "images/magnet.png";

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
//  Type plan  (must match ITEM_TYPE_PLAN in game.js):
//   0  = tiny gold        (50 pts,  very fast)
//   1  = small gold       (100 pts, fast)
//   2  = medium gold      (200 pts, medium)
//   3  = big gold         (350 pts, slow)
//   4  = gold ingot       (450 pts, very slow)
//   5  = small rock       (15 pts,  fast)
//   6  = medium rock      (25 pts,  medium)
//   7  = large rock       (35 pts,  slow)
//   8  = diamond          (700 pts, fast)
//   9  = blue jewelry     (300 pts, medium)
//  10  = pink jewelry     (280 pts, medium)
//  11  = heart jewelry    (260 pts, medium)
//  12  = money bag        (400 pts, medium)
//  13  = mystery bag      (150 pts, medium)  ← unknown bonus
//  14  = magnet           (80 pts,  fast)
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
            // ── Gold nuggets ──────────────────────────────────────────────
            case 0: // tiny gold
                this.speed   = W / 4;
                this.IM      = tinyGoldIm;
                this.itemType = "small_gold";
                this.score   = 50;
                this.applyImageSize(W * 1.3, 1);
                break;
            case 1: // small gold
                this.speed   = W / 6;
                this.IM      = smallGoldIm;
                this.itemType = "small_gold";
                this.score   = 100;
                this.applyImageSize(W * 1.8, 1);
                break;
            case 2: // medium gold
                this.speed   = W / 12;
                this.IM      = mediumGoldIm;
                this.itemType = "big_gold";
                this.score   = 200;
                this.applyImageSize(W * 2.5, 1);
                break;
            case 3: // big gold
                this.speed   = W / 22;
                this.IM      = bigGoldIm;
                this.itemType = "big_gold";
                this.score   = 350;
                this.applyImageSize(W * 3.2, 1);
                break;
            case 4: // gold ingot
                this.speed   = W / 30;
                this.IM      = goldIngotIm;
                this.itemType = "big_gold";
                this.score   = 450;
                this.applyImageSize(W * 2.2, 1.8);
                break;

            // ── Rocks ─────────────────────────────────────────────────────
            case 5: // small rock
                this.speed   = W / 14;
                this.IM      = rockIm;
                this.itemType = "rock";
                this.score   = 15;
                this.applyImageSize(W * 1.8, 1);
                break;
            case 6: // medium rock
                this.speed   = W / 30;
                this.IM      = rockIm;
                this.itemType = "rock";
                this.score   = 25;
                this.applyImageSize(W * 2.3, 1);
                break;
            case 7: // large rock
                this.speed   = W / 50;
                this.IM      = rockIm;
                this.itemType = "rock";
                this.score   = 35;
                this.applyImageSize(W * 2.8, 1);
                break;

            // ── Gems & Jewelry ────────────────────────────────────────────
            case 8: // diamond
                this.speed   = W / 3;
                this.IM      = diamondIM;
                this.itemType = "diamond";
                this.score   = 700;
                this.applyImageSize(W * 1.4, 1);
                break;
            case 9: // blue jewelry
                this.speed   = W / 10;
                this.IM      = blueJewelryIm;
                this.itemType = "diamond";
                this.score   = 300;
                this.applyImageSize(W * 1.8, 1);
                break;
            case 10: // pink jewelry
                this.speed   = W / 10;
                this.IM      = pinkJewelryIm;
                this.itemType = "diamond";
                this.score   = 280;
                this.applyImageSize(W * 1.8, 1);
                break;
            case 11: // heart jewelry
                this.speed   = W / 10;
                this.IM      = heartJewelryIm;
                this.itemType = "diamond";
                this.score   = 260;
                this.applyImageSize(W * 1.8, 1);
                break;

            // ── Special items ─────────────────────────────────────────────
            case 12: // money bag
                this.speed   = W / 18;
                this.IM      = moneyIm;
                this.itemType = "big_gold";
                this.score   = 400;
                this.applyImageSize(W * 2.0, 1);
                break;
            case 13: // mystery bag
                this.speed   = W / 15;
                this.IM      = mysteryBagIm;
                this.itemType = "small_gold";
                this.score   = 150;
                this.applyImageSize(W * 2.0, 1);
                break;
            case 14: // magnet
                this.speed   = W / 4;
                this.IM      = magnetIm;
                this.itemType = "small_gold";
                this.score   = 80;
                this.applyImageSize(W * 1.6, 1);
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
