//declaring variable
let game;

//declaring object
let gameOptions = {
    platformSpeedRange: [300, 300],
    mountainSpeed: 80,
    spawnRange: [80, 300],
    platformSizeRange: [90, 300],
    platformHeightRange: [-5, 5],
    platformHeightScale: 20,
    platformVerticalLimit: [0.4, 0.8],

    playerGravity: 900, 
    jumpForce: 400,
    playerStartPosition: 200,
    jumps: 2,

    //probability of coin appearance
    coinPercent: 25,

    firePercent: 25
};

//setting the game window characteristics
window.onload = function(){
    let gameConfig = {
        type: Phaser.AUTO,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            parent: 'thegame',
            width: 1334,
            height: 750
        },
        scene: [preloadGame, playGame],
        backgroundColor: '#87CEEB',

        physics: {
            default: 'arcade'
        }
    };

    //assigning value to variable
    game = new Phaser.Game(gameConfig);

    //making the current window, i.e., the window with game, focused window
    window.focus();
}

class preloadGame extends Phaser.Scene{
    constructor(){
        super('PreloadGame');
    }
    preload(){
        //loading player
        //this.load.image('player', 'player.png');
        //this.load.image('player-jump', 'player-jump.png')

        //loading platform
        this.load.image('platform', 'platform.png')

        //loading coin
        this.load.spritesheet('coin', 'coin.png', {
            frameWidth: 20,
            frameHeight: 20
        });
        //loading player spritesheet
        this.load.spritesheet("player", "player.png", {
            frameWidth: 24,
            frameHeight: 48
        });

        this.load.spritesheet('mountain', 'mountain.png', {
            frameWidth: 512,
            frameHeight: 512
        });

        this.load.spritesheet('fire', 'fire.png', {
            frameWidth: 40,
            frameHeight: 70
        })

    }
    create(){

        //player movement
        this.anims.create({
            key: "run",
            frames: this.anims.generateFrameNumbers("player", {
                start: 0,
                end: 1
            }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'rotate',
            frames: this.anims.generateFrameNumbers('coin', {
                start: 0,
                end: 5
            }),
            frameRate: 15,
            yoyo: true,
            repeat: -1
        });

        this.anims.create({
            key: 'burn',
            frames: this.anims.generateFrameNumbers('fire', {
                start: 0,
                end: 4
            }),
            frameRate: 15,
            repeat: -1
        })

        this.scene.start('PlayGame');
    }
}

class playGame extends Phaser.Scene{

    coinsCollected = 0;
    coinsCollectedText;

    constructor(){
        super("PlayGame"); //super inherits characteristics of parent class to current class
    }

    init(){
        this.coinsCollected = 0;
    }

    create(){

        this.addedPlatforms = 0;

        this.mountainGroup = this.add.group();

        this.platformGroup = this.add.group({
            //when platform is removed from this group, it is added to Pool group
            removeCallback: function(platform){
                platform.scene.platformPool.add(platform);
            }
        });
        this.platformPool = this.add.group({
            //when platform is removed from this group, it is added to Group group
            removeCallback: function(platform){
                platform.scene.platformGroup.add(platform);
            }
        });

        this.coinGroup = this.add.group({
            removeCallback: function(coin){
                coin.scene.coinPool.add(coin);
            }
        });

        this.coinPool = this.add.group({
            removeCallback: function(coin){
                coin.scene.coinGroup.add(coin);
            }
        })

        this.fireGroup = this.add.group({
            removeCallback: function(fire){
                fire.scene.firePool.add(fire);
            }
        });

        this.firePool = this.add.group({
            removeCallback: function(fire){
                fire.scene.fireGroup.add(fire);
            }
        });

        const style = {color: 'red', fontSize: 40, fontFamily: 'Arial'};
        this.coinsCollectedText = this.add.text(20, 60, 'Score: 0', style);

        this.addMountains();

        //jumps are initialized at 0
        this.playerJumps = 0;

        this.addPlatform(game.config.width, game.config.width/2, game.config.height * gameOptions.platformVerticalLimit[1]);
        
        //adding player 
        this.player = this.physics.add.sprite(gameOptions.playerStartPosition, game.config.height * 0.5, 'player');
        this.player.setGravityY(gameOptions.playerGravity);
        this.player.setDepth(2);

        this.dying = false; //player is not dying

        //setting the player and platform to collide
        this.platformCollider = this.physics.add.collider(this.player, this.platformGroup, function(){
            // run movement of player
            if(!this.player.anims.isPlaying){
                this.player.anims.play("run");
            }
        }, null, this);

        this.physics.add.overlap(this.player, this.coinGroup, function(player, coin){
            this.tweens.add({
                targets: coin,
                //y: coin.y - 100,
                //alpha: 0,
                //duration: 800,
                //ease: "Cubic.easeOut",
                callbackScope: this,
                onComplete: function(){
                    this.coinGroup.killAndHide(coin);
                    this.coinGroup.remove(coin);
                    this.coinsCollected++;
                    const value = `Score: ${this.coinsCollected}`
                    this.coinsCollectedText.text = value;
                }
        })}, null, this);

        this.physics.add.overlap(this.player, this.fireGroup, function(player, fire){
            this.dying = true;
            this.player.anims.stop();
            this.player.setFrame(2);
            this.player.body.setVelocityY(-200);
            this.physics.world.removeCollider(this.platformCollider)
        }, null, this )

        //adding input option
        this.input.on("pointerdown", this.jump, this);

        this.add.text(20, 0, 'Press SPACEBAR to enter fullscreen mode',{
            fontFamily: 'Arial',
            fontSize: 48,
            color: '#ffffff'
        });

        this.input.keyboard.on('keydown_SPACE', function(){
            if(!this.scale.isFullscreen){
                this.scale.startFullscreen();
            }
        }, this);
    }
    
    addMountains(){
        let rightmostMountain = this.getRightMostMountain();
        if(rightmostMountain < game.config.width *2){
            let mountain = this.physics.add.sprite(rightmostMountain + Phaser.Math.Between(100, 350), game.config.height + Phaser.Math.Between(0,100), 'mountain');
            mountain.setOrigin(0.5,1);
            mountain.body.setVelocityX(gameOptions.mountainSpeed *-1);
            this.mountainGroup.add(mountain);
            if (Phaser.Math.Between (0,1) ){
                mountain.setDepth(1);
            }
            mountain.setFrame(Phaser.Math.Between (0, 3));
            this.addMountains();
        }
    }

    getRightMostMountain(){
        let rightmostMountain = -200;
        this.mountainGroup.getChildren().forEach(function(mountain){
            rightmostMountain = Math.max(rightmostMountain, mountain.x);
        })
        return rightmostMountain;
    }

    //collectCoin(player, coin){
    //    this.coinGroup.killAndHide(coin);
    //    this.physics.world.disableBody(coin.body);
    //}

    //two parameters: platform's width and position
    addPlatform(platformWidth, posX, posY){
        this.addedPlatforms++;

        let platform;
        //if platform Pool has platforms
        if(this.platformPool.getLength()){
            //get first platform
            platform = this.platformPool.getFirst();
            //its x position is same as parameter passed
            platform.x = posX;

            platform.y = posY;

            //platform is active
            platform.active = true;
            platform.visible = true;
            //after use, remove from pool
            this.platformPool.remove(platform);

            let newRatio = platformWidth / platform.displayWidth;
            platform.displayWidth = platformWidth;
            platform.tileScaleX = 1/platform.scaleX;
        }
        //if platform Pool does not have available platforms
        else{
            //add platform to screen
            platform = this.add.tileSprite(posX, posY, platformWidth, 32, 'platform');
            this.physics.add.existing(platform);
            platform.body.setImmovable(true);
            platform.body.setVelocityX(Phaser.Math.Between(gameOptions.platformSpeedRange[0], gameOptions.platformSpeedRange[1]) * -1);
            platform.setDepth(2);
            //add platform to the platformGroup
            this.platformGroup.add(platform);
        }
        //platform's width is same as parameter
        //platform.displayWidth = platformWidth;
        //the next platform will be placed anywhere in th spawn range
        this.nextPlatformDistance = Phaser.Math.Between(gameOptions.spawnRange[0], gameOptions.spawnRange[1]);

        if(this.addedPlatforms > 1){
            if(Phaser.Math.Between(1,100) <= gameOptions.coinPercent){
                if(this.coinPool.getLength()){
                    let coin = this.coinPool.getFirst();
                    coin.x = posX;
                    coin.y = posY-96;
                    coin.alpha = 1;
                    coin.active = true;
                    coin.visible = true;
                    this.coinPool.remove(coin);
                }
                else{
                    let coin = this.physics.add.sprite(posX, posY-96, 'coin');
                    coin.setImmovable(true);
                    coin.setVelocityX(platform.body.velocity.x);
                    coin.anims.play('rotate');
                    coin.setDepth(2);
                    this.coinGroup.add(coin);
                }
            }

            if (Phaser.Math.Between(1, 100) <= gameOptions.firePercent){
                if(this.firePool.getLength()){
                    let fire = this.firePool.getFirst();
                    fire.x = posX - platformWidth /2 + Phaser.Math.Between(1, platformWidth);
                    fire.y= posY-46;
                    fire.alpha = true;
                    fire.visible= true;
                    this.firePool.remove(fire);
                }
                else{
                    let fire = this.physics.add.sprite(posX - platformWidth/2 + Phaser.Math.Between(1, platformWidth), posY-46, 'fire');
                    fire.setImmovable(true);
                    fire.setVelocityX(platform.body.velocity.x);
                    fire.setSize(8, 2, true);
                    fire.anims.play('burn');
                    fire.setDepth(2);
                    this.fireGroup.add(fire);
                }
            }
        }
    }

    jump(){
        if((!this.dying) && (this.player.body.touching.down) || (this.playerJumps>0 && this.playerJumps<gameOptions.jumps)){
            if(this.player.body.touching.down){
                this.playerJumps = 0;
            }
            this.player.setVelocityY(gameOptions.jumpForce * -1);
            this.playerJumps ++;

            this.player.anims.stop();
        }
    }

    update(){
        //gameover scenario
        if (this.player.y > game.config.height){
            this.scene.start('PlayGame');
        }
        this.player.x = gameOptions.playerStartPosition;

        //recycling platforms
        let minDistance = game.config.width;
        let rightmostPlatformHeight = 0;
        this.platformGroup.getChildren().forEach(
            function(platform){
                let platformDistance = game.config.width - platform.x - platform.displayWidth/2;
                //minDistance = Math.min(minDistance, platformDistance);
                if(platformDistance < minDistance){
                    minDistance = platformDistance;
                    rightmostPlatformHeight = platform.y;
                }
                if(platform.x < -platform.displayWidth/2){
                    this.platformGroup.killAndHide(platform);
                    this.platformGroup.remove(platform);
                }
            }, this);

        this.coinGroup.getChildren().forEach(function(coin){
            if(coin.x < -coin.displayWidth / 2){
                this.coinGroup.killAndHide(coin);
                this.coinGroup.remove(coin);
            }
        }, this);

        this.fireGroup.getChildren().forEach(function(fire){
            if(fire.x < -fire.displayWidth/2){
                this.fireGroup.killAndHide(fire);
                this.fireGroup.remove(fire);
            }
        }, this);

        this.mountainGroup.getChildren().forEach(function(mountain){
            if(mountain.x < - mountain.displayWidth){
                let rightmostMountain = this.getRightMostMountain;
                mountain.x = rightmostMountain + Phaser.Math.Between(100, 350);
                mountain.y = game.config.height + Phaser.Math.Between (0, 100);
                mountain.setFrame(Phaser.Math.Between(0, 3));
                if (Phaser.Math.Between(0,1)){
                    mountain.setDepth(1);
                }
            }
        }, this);

        //adding platforms
        if(minDistance > this.nextPlatformDistance){
            let nextPlatformWidth = Phaser.Math.Between(gameOptions.platformSizeRange[0], gameOptions.platformSizeRange[1]);
            let platformRandomHeight = gameOptions.platformHeightScale * (Phaser.Math.Between(gameOptions.platformHeightRange[0], gameOptions.platformHeightRange[1]));
            //console.log(rightmostPlatformHeight);
            let nextPlatformGap = rightmostPlatformHeight + platformRandomHeight; 
            let minPlatformHeight = game.config.height * gameOptions.platformVerticalLimit[0];
            let maxPlatformHeight = game.config.height * gameOptions.platformVerticalLimit[1];
            let nextPlatformHeight = Phaser.Math.Clamp(nextPlatformGap, minPlatformHeight, maxPlatformHeight);
            this.addPlatform(nextPlatformWidth, game.config.width + nextPlatformWidth/2, nextPlatformHeight);
        }
    }
}